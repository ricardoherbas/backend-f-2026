import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearParteDiario,
    obtenerParteDiario,
    listarPartesDiarios,
    listarPartesDiariosPaginado,
    actualizarParteDiario,
    eliminarParteDiario
} from '../services/parteDiario.service';

export const crear = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const parte = await crearParteDiario(
            req.body,
            personaIdCuidadora
        );

        res.status(201).json({
            mensaje: 'Parte diario creado correctamente',
            parte
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

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const parte = await obtenerParteDiario(
            id,
            personaIdFamiliar,
            personaIdCuidadora
        );

        res.status(200).json(parte);
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

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const {
            page,
            limit,
            search,
            asignacion_id,
            fecha,
            fechaDesde,
            fechaHasta,
            animo,
            sortBy,
            order
        } = req.query;

        if (page === undefined && limit === undefined) {
            const partes = await listarPartesDiarios(
                personaIdFamiliar,
                personaIdCuidadora
            );

            res.status(200).json(partes);
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

        const asignacionId = asignacion_id !== undefined
            ? Number(asignacion_id)
            : undefined;

        if (
            asignacionId !== undefined &&
            (!Number.isInteger(asignacionId) || asignacionId <= 0)
        ) {
            res.status(400).json({
                mensaje: 'asignacion_id debe ser un entero positivo'
            });
            return;
        }

        const fechaExacta = fecha !== undefined
            ? String(fecha)
            : undefined;

        const fechaInicial = fechaDesde !== undefined
            ? String(fechaDesde)
            : undefined;

        const fechaFinal = fechaHasta !== undefined
            ? String(fechaHasta)
            : undefined;

        const fechas = [fechaExacta, fechaInicial, fechaFinal];

        if (fechas.some(
            valor => valor !== undefined &&
                (
                    !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
                    Number.isNaN(Date.parse(valor))
                )
        )) {
            res.status(400).json({
                mensaje: 'Las fechas deben tener el formato YYYY-MM-DD'
            });
            return;
        }

        if (
            fechaInicial !== undefined &&
            fechaFinal !== undefined &&
            fechaInicial > fechaFinal
        ) {
            res.status(400).json({
                mensaje: 'fechaDesde no puede ser posterior a fechaHasta'
            });
            return;
        }

        const resultado = await listarPartesDiariosPaginado(
            {
                page: pagina,
                limit: limite,
                search: search ? String(search).trim() : undefined,
                asignacion_id: asignacionId,
                fecha: fechaExacta,
                fechaDesde: fechaInicial,
                fechaHasta: fechaFinal,
                animo: animo ? String(animo).trim() : undefined,
                sortBy: sortBy ? String(sortBy) : 'fecha',
                order: direccion as 'ASC' | 'DESC'
            },
            personaIdFamiliar,
            personaIdCuidadora
        );

        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

export const actualizar = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const parte = await actualizarParteDiario(
            id,
            req.body,
            personaIdCuidadora
        );

        res.status(200).json({
            mensaje: 'Parte diario actualizado correctamente',
            parte
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

        await eliminarParteDiario(id);

        res.status(200).json({
            mensaje: 'Parte diario eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
