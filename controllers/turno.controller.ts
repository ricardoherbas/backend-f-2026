import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearTurno,
    obtenerTurno,
    listarTurnos,
    listarTurnosPaginado,
    actualizarTurno,
    eliminarTurno
} from '../services/turno.service';

export const crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const turno = await crearTurno(req.body);

        res.status(201).json({
            mensaje: 'Turno creado correctamente',
            turno
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const personaIdCuidadora = req.usuario?.rol === 'cuidadora'
            ? req.usuario.persona_id
            : undefined;

        const turno = await obtenerTurno(id, personaIdCuidadora);

        res.status(200).json(turno);
    } catch (error) {
        next(error);
    }
};

export const listar = async (req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> => {
    try {
        const personaIdCuidadora = req.usuario?.rol === 'cuidadora'
            ? req.usuario.persona_id
            : undefined;

        const {page, limit, search, dia_semana, activo, sortBy, order} = req.query;

        if (page === undefined && limit === undefined) {
            const turnos = await listarTurnos(personaIdCuidadora);

            res.status(200).json(turnos);
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

        let filtroActivo: boolean | undefined;

        if (activo !== undefined) {
            const valorActivo = String(activo).toLowerCase();

            if (!['true', 'false'].includes(valorActivo)) {
                res.status(400).json({
                    mensaje: 'El parámetro activo debe ser true o false'
                });
                return;
            }

            filtroActivo = valorActivo === 'true';
        }

        const resultado = await listarTurnosPaginado({
            page: pagina,
            limit: limite,
            search: search ? String(search).trim() : undefined,
            dia_semana: dia_semana ? String(dia_semana) : undefined,
            activo: filtroActivo,
            sortBy: sortBy ? String(sortBy) : 'id',
            order: direccion as 'ASC' | 'DESC',
            personaIdCuidadora
        });

        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

export const actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const turno = await actualizarTurno(id, req.body);

        res.status(200).json({
            mensaje: 'Turno actualizado correctamente',
            turno
        });
    } catch (error) {
        next(error);
    }
};

export const eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = Number(req.params.id);

        await eliminarTurno(id);

        res.status(200).json({
            mensaje: 'Turno eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
