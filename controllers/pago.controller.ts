import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearPago,
    obtenerPago,
    listarPagos,
    listarPagosPaginado,
    actualizarPago,
    eliminarPago
} from '../services/pago.service';
import {EstadoPago} from '../types/estado-pago.type';
import {MedioPago} from '../types/medio-pago.type';

const ESTADOS_PERMITIDOS = [
    'pendiente',
    'pagado',
    'vencido'
];

const MEDIOS_PAGO_PERMITIDOS = [
    'efectivo',
    'tarjeta',
    'transferencia',
    'qr',
    'obra_social'
];

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const pago = await crearPago(req.body);

        res.status(201).json({
            mensaje: 'Pago creado correctamente',
            pago
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const pago = await obtenerPago(
            id,
            personaIdFamiliar
        );

        res.status(200).json(pago);
    } catch (error) {
        next(error);
    }
};

export const listar = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const {
            page,
            limit,
            search,
            paciente_id,
            estado,
            medio_pago,
            periodoDesde,
            periodoHasta,
            sortBy,
            order
        } = req.query;

        if (page === undefined && limit === undefined) {
            const pagos = await listarPagos(personaIdFamiliar);

            res.status(200).json(pagos);
            return;
        }

        const pagina = Number(page ?? 1);
        const limite = Number(limit ?? 10);

        if (
            !Number.isInteger(pagina) ||
            pagina <= 0 ||
            !Number.isInteger(limite) ||
            limite <= 0 ||
            limite > 100
        ) {
            res.status(400).json({
                mensaje: 'Los parámetros page y limit deben ser enteros positivos. El límite máximo es 100'
            });
            return;
        }

        const direccion = String(order ?? 'DESC').toUpperCase();

        if (!['ASC', 'DESC'].includes(direccion)) {
            res.status(400).json({
                mensaje: 'El parámetro order debe ser ASC o DESC'
            });
            return;
        }

        const pacienteId = paciente_id !== undefined
            ? Number(paciente_id)
            : undefined;

        if (
            pacienteId !== undefined &&
            (!Number.isInteger(pacienteId) || pacienteId <= 0)
        ) {
            res.status(400).json({
                mensaje: 'paciente_id debe ser un entero positivo'
            });
            return;
        }

        const estadoFiltro = estado !== undefined
            ? String(estado)
            : undefined;

        if (
            estadoFiltro !== undefined &&
            !ESTADOS_PERMITIDOS.includes(estadoFiltro)
        ) {
            res.status(400).json({
                mensaje: 'El estado del pago no es válido'
            });
            return;
        }

        const medioPagoFiltro = medio_pago !== undefined
            ? String(medio_pago)
            : undefined;

        if (
            medioPagoFiltro !== undefined &&
            !MEDIOS_PAGO_PERMITIDOS.includes(medioPagoFiltro)
        ) {
            res.status(400).json({
                mensaje: 'El medio de pago no es válido'
            });
            return;
        }

        const periodoInicial = periodoDesde !== undefined
            ? String(periodoDesde)
            : undefined;

        const periodoFinal = periodoHasta !== undefined
            ? String(periodoHasta)
            : undefined;

        const periodos = [periodoInicial, periodoFinal];

        if (periodos.some(
            valor => valor !== undefined &&
                (
                    !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
                    Number.isNaN(Date.parse(valor))
                )
        )) {
            res.status(400).json({
                mensaje: 'Los períodos deben tener el formato YYYY-MM-DD'
            });
            return;
        }

        if (
            periodoInicial !== undefined &&
            periodoFinal !== undefined &&
            periodoInicial > periodoFinal
        ) {
            res.status(400).json({
                mensaje: 'periodoDesde no puede ser posterior a periodoHasta'
            });
            return;
        }

        const resultado = await listarPagosPaginado(
            {
                page: pagina,
                limit: limite,
                search: search ? String(search).trim() : undefined,
                paciente_id: pacienteId,
                estado: estadoFiltro as EstadoPago | undefined,
                medio_pago: medioPagoFiltro as MedioPago | undefined,
                periodoDesde: periodoInicial,
                periodoHasta: periodoFinal,
                sortBy: sortBy ? String(sortBy) : 'periodo',
                order: direccion as 'ASC' | 'DESC'
            },
            personaIdFamiliar
        );

        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

export const actualizar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const pago = await actualizarPago(
            id,
            req.body
        );

        res.status(200).json({
            mensaje: 'Pago actualizado correctamente',
            pago
        });
    } catch (error) {
        next(error);
    }
};

export const eliminar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        await eliminarPago(id);

        res.status(200).json({
            mensaje: 'Pago eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
