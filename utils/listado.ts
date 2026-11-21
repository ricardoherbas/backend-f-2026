export const texto = (valor: unknown): string | undefined =>
    typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined;

export const numero = (valor: unknown): number | undefined => {
    if (typeof valor !== 'string' || valor.trim() === '') {
        return undefined;
    }
    const n = Number(valor);
    return Number.isFinite(n) ? n : undefined;
};

// Evita que % o _ escritos por el usuario actuen como comodines en el LIKE
export const escaparLike = (valor: string): string =>
    valor.replace(/[\\%_]/g, '\\$&');

export const paginar = (page = 1, limit = 10) => {
    const paginaSegura = Math.max(1, Math.floor(page) || 1);
    const limiteSeguro = Math.min(100, Math.max(1, Math.floor(limit) || 10));

    return {
        page: paginaSegura,
        limit: limiteSeguro,
        offset: (paginaSegura - 1) * limiteSeguro
    };
};

// Solo permite ordenar por campos de la listanunca por texto libre
export const ordenar = (
    sortBy: string | undefined,
    order: string | undefined,
    permitidos: readonly string[],
    porDefecto: string
): [string, 'ASC' | 'DESC'] => {
    const campo =
        sortBy && permitidos.includes(sortBy) ? sortBy : porDefecto;
    const sentido = order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    return [campo, sentido];
};

export const respuestaPaginada = <T>(
    data: T[],
    total: number,
    page: number,
    limit: number
) => ({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
});