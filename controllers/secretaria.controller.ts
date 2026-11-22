import {Request, Response, NextFunction} from 'express';
import {
    crearSecretaria,
    obtenerSecretaria,
    listarSecretarias,
    listarSecretariasPaginado,
    actualizarSecretaria,
    eliminarSecretaria
} from '../services/secretaria.service';

export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const secretaria = await crearSecretaria(req.body);

        res.status(201).json({
            mensaje: 'Secretaria creada correctamente',
            secretaria
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const secretaria = await obtenerSecretaria(id);

        res.status(200).json(secretaria);
    } catch (error) {
        next(error);
    }
};

export const listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {page, limit, search, sortBy, order} = req.query;

        if (page === undefined && limit === undefined) {
            const secretarias = await listarSecretarias();
            res.status(200).json(secretarias);
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

        const resultado = await listarSecretariasPaginado({
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

export const actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const secretaria = await actualizarSecretaria(id, req.body);

        res.status(200).json({
            mensaje: 'Secretaria actualizada correctamente',
            secretaria
        });
    } catch (error) {
        next(error);
    }
};

export const eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);

        await eliminarSecretaria(id);

        res.status(200).json({
            mensaje: 'Secretaria eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};
