import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import AdmZip from 'adm-zip';

export interface GmailTokens {
    access_token?: string | null;
    refresh_token?: string | null;
    scope?: string;
    token_type?: string | null;
    expiry_date?: number | null;
}

export interface InvoiceSearchResult {
    id: string;
    threadId: string;
    snippet: string;
    internalDate: string;
    subject?: string;
    from?: string;
    hasZip: boolean;
    isValidInvoice: boolean;
    fileNames: string[];
    date?: string; // Human readable date for frontend
    status?: 'unread' | 'read' | 'archived' | 'deleted' | 'approved';
}

export class GmailService {
    private oauth2Client: OAuth2Client;

    constructor() {
        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;
        const redirectUri = process.env.GMAIL_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error('Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REDIRECT_URI in environment variables');
        }

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
    }

    public getAuthUrl(
        state?: string,
        options?: { prompt?: 'consent' | 'select_account'; includeGrantedScopes?: boolean; accessType?: 'offline' | 'online' }
    ): string {
        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly'
        ];

        const authOptions: {
            access_type: 'offline' | 'online';
            scope: string[];
            state?: string;
            prompt?: 'consent' | 'select_account';
            include_granted_scopes?: boolean;
        } = {
            access_type: options?.accessType ?? 'offline',
            scope: scopes,
            state: state
        };

        if (options?.prompt) {
            authOptions.prompt = options.prompt;
        }
        if (options?.includeGrantedScopes !== undefined) {
            authOptions.include_granted_scopes = options.includeGrantedScopes;
        }

        return this.oauth2Client.generateAuthUrl(authOptions);
    }

    public async setCredentials(code: string): Promise<GmailTokens> {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    public setTokens(tokens: GmailTokens): void {
        this.oauth2Client.setCredentials(tokens);
    }

    private decodeAttachmentData(data: string): Buffer {
        const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return Buffer.from(padded, 'base64');
    }

    private collectParts(payload: any): any[] {
        const parts: any[] = [];
        const walk = (part: any) => {
            if (!part) {return;}
            parts.push(part);
            if (Array.isArray(part.parts)) {
                part.parts.forEach(walk);
            }
        };
        walk(payload);
        return parts;
    }

    private isLikelyInvoiceXml(content: string): boolean {
        if (!content) {return false;}
        return /<Invoice[\s>]/i.test(content)
            || /<AttachedDocument[\s>]/i.test(content)
            || /<CreditNote[\s>]/i.test(content);
    }

    private selectInvoiceXml(entries: { name: string; content: string }[]): string | null {
        if (!entries.length) {return null;}
        const hasInvoice = (content: string) => /<Invoice[\s>]/i.test(content) || /<CreditNote[\s>]/i.test(content) || /<DebitNote[\s>]/i.test(content);
        const hasAttached = (content: string) => /<AttachedDocument[\s>]/i.test(content);
        const invoiceEntry = entries.find(entry => hasInvoice(entry.content));
        if (invoiceEntry) {return invoiceEntry.content;}
        const attachedEntry = entries.find(entry => hasAttached(entry.content));
        if (attachedEntry) {return attachedEntry.content;}
        const preferred = entries.find(entry => this.isLikelyInvoiceXml(entry.content));
        if (preferred) {return preferred.content;}
        const sorted = [...entries].sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));
        return sorted[0]?.content || null;
    }

    /**
     * Searches for recent invoices, including PDFs and Zips containing (PDF + XML).
     */
    public async findRecentInvoices(days: number = 30): Promise<InvoiceSearchResult[]> {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        // Query: invoice-like attachments (XML or ZIP/RAR), keyword search across subject/body
        const attachmentQuery = 'has:attachment (filename:xml OR filename:zip OR filename:rar)';
        const keywordQuery = '(factura OR "factura electronica" OR "factura electrónica" OR "factura de venta" OR invoice OR bill OR recibo)';
        // Búsqueda amplia: adjuntos OR keywords, dentro del rango de tiempo.
        const query = `newer_than:${days}d (${attachmentQuery} OR ${keywordQuery})`;
        console.log(`🔍 Searching Gmail with query: ${query}`);

        try {
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 10,
            });

            const messages = res.data.messages || [];
            const invoiceDetails: InvoiceSearchResult[] = [];

            for (const message of messages) {
                if (!message.id) {continue;}

                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full',
                });

                const payload = details.data.payload;
                const parts = this.collectParts(payload);
                const subject = payload?.headers?.find(h => h.name === 'Subject')?.value || undefined;
                const from = payload?.headers?.find(h => h.name === 'From')?.value || undefined;

                let hasZip = false;
                let isValidInvoice = false;
                const fileNames: string[] = [];

                // Inspect attachments
                for (const part of parts) {
                    if (part.filename && part.body?.attachmentId) {
                        const lowerName = part.filename.toLowerCase();
                        fileNames.push(part.filename);

                        // Direct PDF is valid
                        if (lowerName.endsWith('.pdf')) {
                            isValidInvoice = true;
                        }

                        // Check Zip content
                        if (lowerName.endsWith('.zip')) {
                            hasZip = true;
                            // Download and inspect zip content
                            const isZipValid = await this.validateZipContent(gmail, message.id, part.body.attachmentId);
                            if (isZipValid) {
                                isValidInvoice = true;
                            }
                        }
                    }
                }

                if (isValidInvoice) {
                    invoiceDetails.push({
                        id: message.id,
                        threadId: message.threadId!,
                        snippet: details.data.snippet!,
                        internalDate: details.data.internalDate!,
                        subject,
                        from,
                        hasZip,
                        isValidInvoice,
                        fileNames
                    });
                }
            }

            return invoiceDetails;
        } catch (error) {
            console.error('❌ Error fetching invoices from Gmail:', error);
            throw error;
        }
    }

    /**
     * Downloads a Zip attachment and checks if it contains both PDF and XML.
     */
    private async validateZipContent(gmail: any, messageId: string, attachmentId: string): Promise<boolean> {
        try {
            const res = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });

            if (!res.data.data) {return false;}

            const buffer = this.decodeAttachmentData(res.data.data);
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();

            let hasPdf = false;
            let hasXml = false;

            for (const entry of zipEntries) {
                const name = entry.entryName.toLowerCase();
                if (name.endsWith('.pdf')) {hasPdf = true;}
                if (name.endsWith('.xml')) {hasXml = true;}
            }

            const isValid = hasPdf && hasXml;
            if (isValid) {console.log(`   ✅ Valid Zip found (PDF + XML)`);}
            return isValid;

        } catch (error) {
            console.error('   ⚠️ Error inspecting zip:', error);
            return false;
        }
    }

    /**
     * Downloads a Zip attachment and checks if it contains both PDF and XML.
     * Returns the XML content if valid, null otherwise.
     */
    private async extractXmlFromZip(gmail: any, messageId: string, attachmentId: string): Promise<string | null> {
        try {
            const res = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });

            if (!res.data.data) {return null;}

            const buffer = this.decodeAttachmentData(res.data.data);
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();

            const xmlEntries: { name: string; content: string }[] = [];
            let hasPdf = false;

            for (const entry of zipEntries) {
                const name = entry.entryName.toLowerCase();
                if (name.endsWith('.pdf')) {hasPdf = true;}
                if (name.endsWith('.xml')) {
                    xmlEntries.push({
                        name: entry.entryName,
                        content: entry.getData().toString('utf-8')
                    });
                }
            }

            const xmlContent = this.selectInvoiceXml(xmlEntries);
            if (xmlContent) {
                if (!hasPdf) {
                    console.warn('   ⚠️ Zip sin PDF, se usará el XML igualmente');
                } else {
                    console.log(`   ✅ Valid Zip found (PDF + XML)`);
                }
                return xmlContent;
            }

            return null;

        } catch (error) {
            console.error('   ⚠️ Error inspecting zip:', error);
            return null;
        }
    }

    /**
     * Downloads a direct attachment.
     */
    private async downloadAttachment(gmail: any, messageId: string, attachmentId: string): Promise<string | null> {
        try {
            const res = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });
            if (!res.data.data) {return null;}
            return this.decodeAttachmentData(res.data.data).toString('utf-8');
        } catch (e) {
            console.error('Error downloading attachment', e);
            return null;
        }
    }

    /**
    * Fetches invoices (XMLs) from Gmail, handling both direct XMLs and Zips (PDF+XML).
    * Compatible with invoice.controller expecting { messageId, filename, xmlContent, date }
    */
    public async fetchInvoiceEmails(userId: string) { // userId param kept for compatibility but 'me' is used with stored tokens
        // Ensure tokens are set (caller should have called setTokens or we use env if single user... 
        // actually existing logic loads tokens from DB. Controller should handle loading tokens and calling setTokens)
        // But for this integration, let's assume the controller sets the credentials on this instance before calling.

        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        // Query: check for xml, zip, rar attachments with invoice keywords (subject/body)
        const attachmentQuery = 'has:attachment (filename:xml OR filename:zip OR filename:rar)';
        const keywordQuery = '(factura OR "factura electronica" OR "factura electrónica" OR "factura de venta" OR invoice OR bill OR recibo)';
        const query = `${attachmentQuery} ${keywordQuery}`;

        try {
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 10,
            });

            const messages = res.data.messages || [];
            const invoices: any[] = []; // Using any to match the JS return shape loosely

            for (const message of messages) {
                if (!message.id) {continue;}

                // Check if already processed (this logic was in controller or service? verify markAsProcessed usage)
                // We'll skip check for now and let the search query or post-process handle it, 
                // but usually we want to filter by label or DB check. 
                // Existing service used a label check? No, query didn't exclude. 
                // Controller checked for duplicates in DB.

                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full',
                });

                const allParts = this.collectParts(details.data.payload);

                for (const part of allParts) {
                    if (part.filename && part.body?.attachmentId) {
                        const lowerName = part.filename.toLowerCase();
                        let xmlContent: string | null = null;

                        if (lowerName.endsWith('.xml')) {
                            xmlContent = await this.downloadAttachment(gmail, message.id, part.body.attachmentId);
                        } else if (lowerName.endsWith('.zip')) {
                            xmlContent = await this.extractXmlFromZip(gmail, message.id, part.body.attachmentId);
                        } else if (lowerName.endsWith('.rar')) {
                            console.warn(`   ⚠️ Archivo RAR no soportado: ${part.filename}`);
                        }

                        if (xmlContent) {
                            invoices.push({
                                messageId: message.id,
                                filename: part.filename,
                                xmlContent,
                                date: details.data.internalDate
                            });
                            // Handle one invoice per email? Or multiple? 
                            // Usually one XML per invoice.
                        }
                    }
                }
            }
            return invoices;
        } catch (error) {
            console.error('Error fetching invoices', error);
            throw error;
        }
    }

    public async markAsProcessed(userId: string, messageId: string) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        try {
            // Get or create label
            const labelsRes = await gmail.users.labels.list({ userId: 'me' });
            let label = labelsRes.data.labels?.find(l => l.name === 'PROCESSED');

            if (!label) {
                const createRes = await gmail.users.labels.create({
                    userId: 'me',
                    requestBody: { name: 'PROCESSED', labelListVisibility: 'labelShow', messageListVisibility: 'show' }
                });
                label = createRes.data;
            }

            if (label?.id) {
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: messageId,
                    requestBody: { addLabelIds: [label.id] }
                });
            }
        } catch (e) {
            console.error('Error marking as processed', e);
        }
    }

    /**
     * Searches for messages with invoice-like characteristics within a time range.
     * Lightweight search for listing purposes.
     */
    public async searchHistoricalMessages(days: number = 30): Promise<InvoiceSearchResult[]> {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const attachmentQuery = 'has:attachment (filename:xml OR filename:zip OR filename:rar)';
        const keywordQuery = '(factura OR "factura electronica" OR "factura electrónica" OR "factura de venta" OR invoice OR bill OR recibo)';
        const query = `${attachmentQuery} ${keywordQuery} newer_than:${days}d`;

        console.log(`🔍 Historical Search Query: ${query}`);

        try {
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 50, // Increase for history
            });

            const messages = res.data.messages || [];
            const results: InvoiceSearchResult[] = [];

            for (const m of messages) {
                if (!m.id) {continue;}

                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: m.id,
                    format: 'metadata',
                    metadataHeaders: ['Subject', 'From', 'Date']
                });

                const payload = details.data.payload;
                const headers = payload?.headers || [];
                const subject = headers.find(h => h.name === 'Subject')?.value || 'Sin asunto';
                const from = headers.find(h => h.name === 'From')?.value || 'Desconocido';
                const dateHeader = headers.find(h => h.name === 'Date')?.value;

                results.push({
                    id: m.id,
                    threadId: m.threadId!,
                    snippet: details.data.snippet || '',
                    internalDate: details.data.internalDate!,
                    date: dateHeader,
                    subject,
                    from,
                    hasZip: false, // Placeholder for metadata search
                    isValidInvoice: true, // Assume valid for listing, confirm during import
                    fileNames: []
                });
            }

            return results;
        } catch (error) {
            console.error('❌ Error in historical search:', error);
            throw error;
        }
    }

    /**
     * Fetches and processes specific messages by ID.
     */
    public async fetchSpecificMessages(messageIds: string[]) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const invoices: any[] = [];

        for (const messageId of messageIds) {
            try {
                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: messageId,
                    format: 'full',
                });

                const allParts = this.collectParts(details.data.payload);

                for (const part of allParts) {
                    if (part.filename && part.body?.attachmentId) {
                        const lowerName = part.filename.toLowerCase();
                        let xmlContent: string | null = null;

                        if (lowerName.endsWith('.xml')) {
                            xmlContent = await this.downloadAttachment(gmail, messageId, part.body.attachmentId);
                        } else if (lowerName.endsWith('.zip')) {
                            xmlContent = await this.extractXmlFromZip(gmail, messageId, part.body.attachmentId);
                        } else if (lowerName.endsWith('.rar')) {
                            console.warn(`   ⚠️ Archivo RAR no soportado: ${part.filename}`);
                        }

                        if (xmlContent) {
                            invoices.push({
                                messageId,
                                filename: part.filename,
                                xmlContent,
                                date: details.data.internalDate
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`Error processing specific message ${messageId}:`, err);
            }
        }
        return invoices;
    }

    public async getProfile() {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        const res = await gmail.users.getProfile({ userId: 'me' });
        return res.data;
    }
}
