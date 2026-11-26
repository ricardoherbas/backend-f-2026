import {Request, Response, NextFunction} from 'express';
import {
    crearPersona,
    obtenerPersona,
    listarPersonas,
    listarPersonasPaginado,
    actualizarPersona
} from '../services/personas.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const persona = await crearPersona(req.body);

        res.status(201).json({
            mensaje: 'Persona creada correctamente',
            persona
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

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({
                mensaje: 'El ID de la persona no es válido'
            });
            return;
        }

        const persona = await obtenerPersona(id);

        res.status(200).json(persona);
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

        const solicitaBusqueda =
            req.query.search !== undefined ||
            req.query.sortBy !== undefined ||
            req.query.order !== undefined;

        if (!solicitaPaginacion && !solicitaBusqueda) {
            const personas = await listarPersonas();

            res.status(200).json(personas);
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

        const resultado = await listarPersonasPaginado({
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

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({
                mensaje: 'El ID de la persona no es válido'
            });
            return;
        }

        const persona = await actualizarPersona(
            id,
            req.body
        );

        res.status(200).json({
            mensaje: 'Persona actualizada correctamente',
            persona
        });
    } catch (error) {
        next(error);
    }
};
