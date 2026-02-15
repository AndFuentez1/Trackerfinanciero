import type { Transaction, PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import { Button } from '@/shared/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportExcelButtonProps {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
}

const categoryLabels: Record<string, string> = {
  salary: 'Salario',
  otherincome: 'Otros ingresos',
  food: 'Alimentación',
  rent: 'Arriendo y mudanzas',
  cleaning: 'Aseo y limpieza',
  grooming: 'Cuidado personal y estética',
  phone: 'Teléfono',
  restaurants: 'Restaurantes',
  shopping: 'Mecato y bebidas',
  education: 'Educación',
  gym: 'Gym',
  coffice: 'Oficina y trabajo',
  travel: 'Salidas, hospedajes y ocio',
  apps: 'Aplicativos, libros y gadgets',
  clothes: 'Ropa, calzado y accesorios',
  pharmacy: 'Farmacia y Salud',
  health: 'Salud y pensión',
  life: 'Seguro de vida',
  carinsurance: 'Seguro moto',
  civic: 'Civica',
  transport: 'Transporte',
  gas: 'Gasolina',
  parking: 'Parqueadero',
  bike: 'Moto',
  gifts: 'Regalos',
  home: 'Utilería hogar y decoración',
  office: 'Utilería oficina',
  documents: 'Documentos y papelería',
  assets: 'Grandes activos',
  repairs: 'Reparaciones',
  loans: 'Préstamos',
  taxesfine: 'Impuestos y multas',
  savings: 'Ahorro',
  stocks: 'Acciones',
  cdt: 'CDT',
  other: 'Otro',
};

export function ExportExcelButton({ transactions, paymentMethods }: ExportExcelButtonProps) {
  const handleExport = () => {
    // Format: Fecha | Descripción | Categoría | Valor | Método de pago
    const data = transactions.map((t) => {
      const paymentMethod = t.payment_method_id
        ? paymentMethods.find(pm => pm.id === t.payment_method_id)?.name || ''
        : '';

      return {
        Fecha: t.date,
        Descripción: t.description,
        Categoría: categoryLabels[t.category] || t.category,
        Valor: t.amount,
        'Método de pago': paymentMethod,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

    // Auto-size columns
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 30 }, // Descripción
      { wch: 15 }, // Categoría
      { wch: 12 }, // Valor
      { wch: 20 }, // Método de pago
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `transacciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Button
      variant="default"
      size="sm"
      className="gap-2 min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60"
      onClick={handleExport}
      aria-label="Exportar Excel"
      title="Exportar Excel"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">Exportar Excel</span>
    </Button>
  );
}


