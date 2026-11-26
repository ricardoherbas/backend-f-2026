import { Request, Response, NextFunction } from 'express';

export const validarAsignacion = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const {
        turno_id,
        cuidador_id,
        paciente_id,
        activo,
    } = req.body;

    if (!Number.isInteger(turno_id) || turno_id <= 0) {
        res.status(400).json({
            mensaje: 'turno_id debe ser un número entero válido',
        });
        return;
    }

    if (!Number.isInteger(cuidador_id) || cuidador_id <= 0) {
        res.status(400).json({
            mensaje: 'cuidador_id debe ser un número entero válido',
        });
        return;
    }

    if (!Number.isInteger(paciente_id) || paciente_id <= 0) {
        res.status(400).json({
            mensaje: 'paciente_id debe ser un número entero válido',
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

const CAMPOS_ASIGNACION_EDITABLES = [
    'turno_id',
    'cuidador_id',
    'paciente_id',
    'activo',
];

// Validación para PATCH: todos los campos son opcionales, pero los que
// lleguen se validan con las mismas reglas que en el alta.
export const validarAsignacionParcial = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const cuerpo = req.body ?? {};

    const datos: Record<string, unknown> = {};

    for (const campo of CAMPOS_ASIGNACION_EDITABLES) {
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

    for (const campo of ['turno_id', 'cuidador_id', 'paciente_id']) {
        const valor = datos[campo];

        if (campo in datos && (!Number.isInteger(valor) || (valor as number) <= 0)) {
            res.status(400).json({
                mensaje: `${campo} debe ser un número entero válido`,
            });
            return;
        }
    }

    if ('activo' in datos && typeof datos.activo !== 'boolean') {
        res.status(400).json({
            mensaje: 'activo debe ser booleano',
        });
        return;
    }

    req.body = datos;

    next();
};
