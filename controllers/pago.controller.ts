import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {crearPago, obtenerPago, listarPagos, actualizarPago, eliminarPago, generarReportePagos} from '../services/pago.service';
import {texto, numero} from '../utils/listado';

const leerFiltros = (req: RequestAutenticado) => ({
    busqueda: texto(req.query.busqueda),
    estado: texto(req.query.estado),
    medio_pago: texto(req.query.medio_pago),
    paciente_id: numero(req.query.paciente_id),
    periodo_desde: texto(req.query.periodo_desde),
    periodo_hasta: texto(req.query.periodo_hasta)
});

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const pago =
            await crearPago(req.body);

        res.status(201).json({
            mensaje:
                'Pago creado correctamente',
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
        const id =
            Number(req.params.id);

        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const pago =
            await obtenerPago(
                id,
                personaIdFamiliar
            );

        res.status(200).json(
            pago
        );
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

        const resultado = await listarPagos(
            {
                page: numero(req.query.page),
                limit: numero(req.query.limit),
                sortBy: texto(req.query.sortBy),
                order: texto(req.query.order),
                ...leerFiltros(req)
            },
            personaIdFamiliar
        );

        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

export const reporte = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const archivo = await generarReportePagos(
            leerFiltros(req),
            personaIdFamiliar
        );

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="pagos.xlsx"'
        );
        res.status(200).send(archivo);
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
        const id =
            Number(req.params.id);

        const pago =
            await actualizarPago(
                id,
                req.body
            );

        res.status(200).json({
            mensaje:
                'Pago actualizado correctamente',
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
        const id =
            Number(req.params.id);

        await eliminarPago(id);

        res.status(200).json({
            mensaje:
                'Pago eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};