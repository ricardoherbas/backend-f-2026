import {Request, Response, NextFunction} from 'express';
import {
    crearFamiliar,
    obtenerFamiliar,
    listarFamiliares,
    listarFamiliaresPaginado,
    actualizarFamiliar,
    eliminarFamiliar
} from '../services/familiar.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const familiar = await crearFamiliar(req.body);

        res.status(201).json({
            mensaje: 'Familiar creado correctamente',
            familiar
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
        const familiar = await obtenerFamiliar(id);

        res.status(200).json(familiar);
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
        const {page, limit, search, sortBy, order} = req.query;

        if (page === undefined && limit === undefined) {
            const familiares = await listarFamiliares();
            res.status(200).json(familiares);
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

        const direccion = String(order ?? 'ASC').toUpperCase();

        if (!['ASC', 'DESC'].includes(direccion)) {
            res.status(400).json({
                mensaje: 'El parámetro order debe ser ASC o DESC'
            });
            return;
        }

        const resultado = await listarFamiliaresPaginado({
            page: pagina,
            limit: limite,
            search: search ? String(search).trim() : undefined,
            sortBy: sortBy ? String(sortBy) : 'id',
            order: direccion as 'ASC' | 'DESC'
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
        const familiar = await actualizarFamiliar(id, req.body);

        res.status(200).json({
            mensaje: 'Familiar actualizado correctamente',
            familiar
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

        await eliminarFamiliar(id);

        res.status(200).json({
            mensaje: 'Familiar eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
