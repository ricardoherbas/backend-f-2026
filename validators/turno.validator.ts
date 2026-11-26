import { Request, Response, NextFunction } from 'express';

const diasPermitidos = [
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
    'domingo',
];

export const validarTurno = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const {
        dia_semana,
        hora_inicio,
        hora_fin,
        activo,
    } = req.body;

    if (!dia_semana || typeof dia_semana !== 'string') {
        res.status(400).json({
            mensaje: 'El día de la semana es obligatorio',
        });
        return;
    }

    if (!diasPermitidos.includes(dia_semana)) {
        res.status(400).json({
            mensaje: 'El día de la semana no es válido',
        });
        return;
    }

    if (!hora_inicio || typeof hora_inicio !== 'string') {
        res.status(400).json({
            mensaje: 'La hora de inicio es obligatoria',
        });
        return;
    }

    if (!hora_fin || typeof hora_fin !== 'string') {
        res.status(400).json({
            mensaje: 'La hora de fin es obligatoria',
        });
        return;
    }

    if (hora_fin <= hora_inicio) {
        res.status(400).json({
            mensaje: 'La hora de fin debe ser posterior a la hora de inicio',
        });
        return;
    }

    if (activo !== undefined && typeof activo !== 'boolean') {
        res.status(400).json({
            mensaje: 'activo debe ser booleano',
        });
        return;
    }

    next();
};

const CAMPOS_TURNO_EDITABLES = [
    'dia_semana',
    'hora_inicio',
    'hora_fin',
    'activo',
];

// Validación para PATCH: todos los campos son opcionales, pero los que
// lleguen se validan con las mismas reglas que en el alta.
// La comparación entre hora_inicio y hora_fin cuando solo llega una de las
// dos se completa en el service, con el valor guardado.
export const validarTurnoParcial = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const cuerpo = req.body ?? {};

    const datos: Record<string, unknown> = {};

    for (const campo of CAMPOS_TURNO_EDITABLES) {
        if (cuerpo[campo] !== undefined) {
            datos[campo] = cuerpo[campo];
        }
    }

    if (Object.keys(datos).length === 0) {
        res.status(400).json({
            mensaje: 'Debe enviar al menos un campo para actualizar',
        });
        return;
    }

    const { dia_semana, hora_inicio, hora_fin, activo } = datos as {
        dia_semana: string;
        hora_inicio: string;
        hora_fin: string;
        activo: unknown;
    };

    if (
        'dia_semana' in datos &&
        (typeof dia_semana !== 'string' || !diasPermitidos.includes(dia_semana))
    ) {
        res.status(400).json({
            mensaje: 'El día de la semana no es válido',
        });
        return;
    }

    if ('hora_inicio' in datos && (!hora_inicio || typeof hora_inicio !== 'string')) {
        res.status(400).json({
            mensaje: 'La hora de inicio no es válida',
        });
        return;
    }

    if ('hora_fin' in datos && (!hora_fin || typeof hora_fin !== 'string')) {
        res.status(400).json({
            mensaje: 'La hora de fin no es válida',
        });
        return;
    }

    if ('hora_inicio' in datos && 'hora_fin' in datos && hora_fin <= hora_inicio) {
        res.status(400).json({
            mensaje: 'La hora de fin debe ser posterior a la hora de inicio',
        });
        return;
    }

    if ('activo' in datos && typeof activo !== 'boolean') {
        res.status(400).json({
            mensaje: 'activo debe ser booleano',
        });
        return;
    }

    req.body = datos;

    next();
};
