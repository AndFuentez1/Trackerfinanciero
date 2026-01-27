'use client';

import { WalletCard } from "@/components/ui/wallet-card";
import {
    Wallet,
    TrendingUp,
} from "lucide-react"

export default function WalletCardDemo() {
    return (
        <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-transparent min-h-[600px]">
            <WalletCard
                totalBalance="$5,210.25"
                btcAmount="0.192 BTC"
                fundingBalance="$1,250.00"
                tradingBalance="$3,960.25"
                accounts={[
                    {
                        id: "1",
                        name: "Cuenta Principal",
                        description: "Ahorros & Corriente",
                        icon: <Wallet className="w-5 h-5 text-slate-600" />,
                    },
                    {
                        id: "2",
                        name: "Portafolio Inversión",
                        description: "Acciones & Crypto",
                        icon: <TrendingUp className="w-5 h-5 text-slate-600" />,
                    },
                ]}
            />
        </div>
    );
}
