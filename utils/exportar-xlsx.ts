import {Workbook} from 'exceljs';

export interface ColumnaXlsx {
    encabezado: string;
    clave: string;
    ancho?: number;
}

export const generarXlsx = async (
    nombreHoja: string,
    columnas: ColumnaXlsx[],
    filas: Record<string, string | number | null>[]
): Promise<Buffer> => {
    const libro = new Workbook();
    const hoja = libro.addWorksheet(nombreHoja);

    hoja.columns = columnas.map((c) => ({
        header: c.encabezado,
        key: c.clave,
        width: c.ancho ?? 18
    }));
    hoja.getRow(1).font = {bold: true};

    filas.forEach((fila) => hoja.addRow(fila));

    return Buffer.from(await libro.xlsx.writeBuffer());
};