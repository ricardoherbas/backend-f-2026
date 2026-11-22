import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearAsignacion,
    obtenerAsignacion,
    listarAsignaciones,
    listarAsignacionesPaginado,
    actualizarAsignacion,
    eliminarAsignacion
} from '../services/asignacion.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const asignacion = await crearAsignacion(req.body);

        res.status(201).json({
            mensaje: 'Asignación creada correctamente',
            asignacion
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

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const asignacion = await obtenerAsignacion(
            id,
            personaIdCuidadora
        );

        res.status(200).json(asignacion);
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
        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const {
            page,
            limit,
            search,
            turno_id,
            cuidador_id,
            paciente_id,
            activo,
            sortBy,
            order
        } = req.query;

        if (page === undefined && limit === undefined) {
            const asignaciones = await listarAsignaciones(
                personaIdCuidadora
            );

            res.status(200).json(asignaciones);
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

        const parsearId = (
            valor: unknown,
            campo: string
        ): number | undefined => {
            if (valor === undefined) return undefined;

            const numero = Number(valor);

            if (!Number.isInteger(numero) || numero <= 0) {
                throw new Error(`${campo} debe ser un entero positivo`);
            }

            return numero;
        };

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

        let turnoId: number | undefined;
        let cuidadorId: number | undefined;
        let pacienteId: number | undefined;

        try {
            turnoId = parsearId(turno_id, 'turno_id');
            cuidadorId = parsearId(cuidador_id, 'cuidador_id');
            pacienteId = parsearId(paciente_id, 'paciente_id');
        } catch (error) {
            res.status(400).json({
                mensaje: error instanceof Error
                    ? error.message
                    : 'Los filtros de identificación no son válidos'
            });
            return;
        }

        const resultado = await listarAsignacionesPaginado({
            page: pagina,
            limit: limite,
            search: search ? String(search).trim() : undefined,
            turno_id: turnoId,
            cuidador_id: cuidadorId,
            paciente_id: pacienteId,
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

export const actualizar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const asignacion = await actualizarAsignacion(
            id,
            req.body
        );

        res.status(200).json({
            mensaje: 'Asignación actualizada correctamente',
            asignacion
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

        await eliminarAsignacion(id);

        res.status(200).json({
            mensaje: 'Asignación eliminada correctamente'
        });
    } catch (error) {
        next(error);
    }
};
