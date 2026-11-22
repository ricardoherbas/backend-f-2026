import {Request, Response, NextFunction} from 'express';
import {
    crearCuidadora,
    obtenerCuidadora,
    listarCuidadoras,
    listarCuidadorasPaginado,
    actualizarCuidadora,
    eliminarCuidadora
} from '../services/cuidadora.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const cuidadora = await crearCuidadora(req.body);

        res.status(201).json({
            mensaje: 'Cuidadora creada correctamente',
            cuidadora
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const cuidadora = await obtenerCuidadora(id);

        res.status(200).json(cuidadora);
    } catch (error) {
        next(error);
    }
};

export const listar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const solicitaPaginacion =
            req.query.page !== undefined ||
            req.query.limit !== undefined;

        if (!solicitaPaginacion) {
            const cuidadoras = await listarCuidadoras();
            res.status(200).json(cuidadoras);
            return;
        }

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            res.status(400).json({
                mensaje: 'Los parámetros page y limit deben ser enteros positivos'
            });
            return;
        }

        if (limit > 100) {
            res.status(400).json({
                mensaje: 'El límite máximo de registros por página es 100'
            });
            return;
        }

        const orderQuery =
            String(req.query.order ?? 'ASC').toUpperCase();

        if (orderQuery !== 'ASC' && orderQuery !== 'DESC') {
            res.status(400).json({
                mensaje: 'El parámetro order debe ser ASC o DESC'
            });
            return;
        }

        const resultado = await listarCuidadorasPaginado({
            page,
            limit,
            search: req.query.search
                ? String(req.query.search).trim()
                : undefined,
            sortBy: req.query.sortBy
                ? String(req.query.sortBy)
                : 'id',
            order: orderQuery
        });

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
        const cuidadora = await actualizarCuidadora(id, req.body);

        res.status(200).json({
            mensaje: 'Cuidadora actualizada correctamente',
            cuidadora
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

        await eliminarCuidadora(id);

        res.status(200).json({
            mensaje: 'Cuidadora eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};
