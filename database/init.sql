
CREATE TABLE personas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    telefono VARCHAR(30)
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE,
    CHECK (rol IN ('administrador','secretaria','cuidadora','familiar'))
);

CREATE TABLE administradores (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    CONSTRAINT fk_administrador_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE
);

CREATE TABLE secretarias (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    CONSTRAINT fk_secretaria_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE
);

CREATE TABLE cuidadores (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    CONSTRAINT fk_cuidador_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE
);

CREATE TABLE familiares (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    CONSTRAINT fk_familiar_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE
);

CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE,
    direccion VARCHAR(200),
    obra_social VARCHAR(100),
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paciente_persona
        FOREIGN KEY (persona_id)
        REFERENCES personas(id)
        ON DELETE CASCADE
);

CREATE TABLE vinculos_familiares (
    id SERIAL PRIMARY KEY,
    familiar_id INT NOT NULL,
    paciente_id INT NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    es_contacto_principal BOOLEAN NOT NULL DEFAULT FALSE,
    codigo_vinculacion VARCHAR(100) UNIQUE,
    codigo_usado BOOLEAN NOT NULL DEFAULT FALSE,
    expira_en TIMESTAMP NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vinculo_familiar
        FOREIGN KEY (familiar_id)
        REFERENCES familiares(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_familiar_paciente
        UNIQUE (familiar_id,paciente_id)
);

CREATE TABLE turnos (
    id SERIAL PRIMARY KEY,
    dia_semana VARCHAR(15) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (dia_semana IN ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
    CHECK (hora_fin > hora_inicio)
);

CREATE TABLE asignaciones (
    id SERIAL PRIMARY KEY,
    turno_id INT NOT NULL,
    cuidador_id INT NOT NULL,
    paciente_id INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_asignacion_turno
        FOREIGN KEY (turno_id)
        REFERENCES turnos(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_asignacion_cuidador
        FOREIGN KEY (cuidador_id)
        REFERENCES cuidadores(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_asignacion_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_asignacion
        UNIQUE (turno_id,cuidador_id,paciente_id)
);

CREATE TABLE medicamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    presentacion VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    CONSTRAINT chk_medicamento_cantidad
        CHECK (cantidad > 0)
);

CREATE TABLE tratamientos (
    id SERIAL PRIMARY KEY,
    paciente_id INT NOT NULL,
    medicamento_id INT NOT NULL,
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    horario VARCHAR(100),
    desde DATE,
    hasta DATE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tratamiento_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tratamiento_medicamento
        FOREIGN KEY (medicamento_id)
        REFERENCES medicamentos(id)
        ON DELETE RESTRICT,
    CHECK (hasta IS NULL OR desde IS NULL OR hasta >= desde)
);

CREATE TABLE partes_diarios (
    id SERIAL PRIMARY KEY,
    asignacion_id INT NOT NULL,
    fecha DATE NOT NULL,
    animo VARCHAR(50),
    alimentacion VARCHAR(100),
    descanso VARCHAR(100),
    higiene VARCHAR(100),
    novedades TEXT,
    observaciones TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_parte_asignacion
        FOREIGN KEY (asignacion_id)
        REFERENCES asignaciones(id)
        ON DELETE RESTRICT
);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    paciente_id INT NOT NULL,
    periodo DATE NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    fecha_pago DATE,
    medio_pago VARCHAR(30),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    observaciones TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pago_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE RESTRICT,
    CHECK (monto >= 0),
    CHECK (medio_pago IS NULL OR medio_pago IN ('efectivo','tarjeta','transferencia','qr','obra_social')),
    CHECK (estado IN ('pendiente','pagado','vencido')),
    CONSTRAINT uq_pago_paciente_periodo
        UNIQUE (paciente_id,periodo)
);

CREATE TABLE tokens_recuperacion (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_token_recuperacion_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_actualizado
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE OR REPLACE FUNCTION actualizar_estado_pago()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_pago IS NOT NULL THEN
        NEW.estado = 'pagado';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_estado_pago
BEFORE INSERT OR UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_pago();

CREATE OR REPLACE FUNCTION actualizar_pagos_vencidos()
RETURNS VOID AS $$
BEGIN
    UPDATE pagos
    SET estado = 'vencido'
    WHERE estado = 'pendiente'
      AND fecha_pago IS NULL
      AND periodo < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;







-- ============================================================
-- DATOS INICIALES DE PRUEBA
-- Sistema de gestión geriátrica
-- Contraseña de todas las cuentas: 123456789
-- ============================================================

BEGIN;

-- Necesario para generar hashes bcrypt desde PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. PERSONAS
-- ============================================================

INSERT INTO personas (nombre, apellido, dni, fecha_nacimiento, telefono)
VALUES
-- Administrador
('Roberto', 'Administrador', '30000001', '1970-05-10', '2914000001'),

-- Secretarias
('Laura', 'Gómez', '30000002', '1985-03-15', '2914000002'),
('Mariana', 'Pérez', '30000003', '1990-07-20', '2914000003'),

-- Cuidadoras
('Ana', 'Fernández', '30000004', '1988-02-12', '2914000004'),
('Carlos', 'Ramírez', '30000005', '1982-09-25', '2914000005'),
('Silvia', 'Torres', '30000006', '1992-11-08', '2914000006'),
('Diego', 'Martínez', '30000007', '1985-06-17', '2914000007'),

-- Familiares
('Pedro', 'López', '30000008', '1975-04-22', '2914000008'),
('Claudia', 'Sánchez', '30000009', '1980-08-13', '2914000009'),
('Miguel', 'Rodríguez', '30000010', '1978-12-01', '2914000010'),
('Patricia', 'Díaz', '30000011', '1983-01-30', '2914000011'),

-- Pacientes
('José', 'García', '30000012', '1940-05-14', '2914000012'),
('Elena', 'Morales', '30000013', '1938-09-21', '2914000013'),
('Raúl', 'Castro', '30000014', '1945-03-11', '2914000014'),
('Marta', 'Herrera', '30000015', '1942-07-19', '2914000015'),
('Teresa', 'Navarro', '30000016', '1939-12-05', '2914000016');


-- ============================================================
-- 2. USUARIOS
-- Contraseña de todos: 123456789
-- Hash bcrypt generado con pgcrypto.
-- ============================================================

INSERT INTO usuarios (persona_id, email, password_hash, rol, activo)
SELECT
    p.id,
    datos.email,
    crypt('123456789', gen_salt('bf', 10)),
    datos.rol,
    TRUE
FROM (
    VALUES
    ('30000001', 'admin@geriatrico.com', 'administrador'),
    ('30000002', 'laura@geriatrico.com', 'secretaria'),
    ('30000003', 'mariana@geriatrico.com', 'secretaria'),
    ('30000004', 'ana@geriatrico.com', 'cuidadora'),
    ('30000005', 'carlos@geriatrico.com', 'cuidadora'),
    ('30000006', 'silvia@geriatrico.com', 'cuidadora'),
    ('30000007', 'diego@geriatrico.com', 'cuidadora'),
    ('30000008', 'pedro@familia.com', 'familiar'),
    ('30000009', 'claudia@familia.com', 'familiar'),
    ('30000010', 'miguel@familia.com', 'familiar'),
    ('30000011', 'patricia@familia.com', 'familiar')
) AS datos(dni, email, rol)
INNER JOIN personas p ON p.dni = datos.dni;


-- ============================================================
-- 3. ADMINISTRADORES
-- ============================================================

INSERT INTO administradores (persona_id)
SELECT id
FROM personas
WHERE dni = '30000001';


-- ============================================================
-- 4. SECRETARIAS
-- ============================================================

INSERT INTO secretarias (persona_id)
SELECT id
FROM personas
WHERE dni IN ('30000002', '30000003');


-- ============================================================
-- 5. CUIDADORAS
-- ============================================================

INSERT INTO cuidadores (persona_id)
SELECT id
FROM personas
WHERE dni IN ('30000004', '30000005', '30000006', '30000007');


-- ============================================================
-- 6. FAMILIARES
-- ============================================================

INSERT INTO familiares (persona_id)
SELECT id
FROM personas
WHERE dni IN ('30000008', '30000009', '30000010', '30000011');


-- ============================================================
-- 7. PACIENTES
-- ============================================================

INSERT INTO pacientes (
    persona_id,
    direccion,
    obra_social,
    observaciones,
    activo
)
SELECT
    p.id,
    datos.direccion,
    datos.obra_social,
    datos.observaciones,
    TRUE
FROM (
    VALUES
    ('30000012', 'Av. Alem 1250', 'PAMI', 'Requiere asistencia para movilizarse.'),
    ('30000013', 'Calle Brown 850', 'PAMI', 'Control periódico de presión arterial.'),
    ('30000014', 'Av. Colón 2300', 'OSDE', 'Necesita acompañamiento en actividades diarias.'),
    ('30000015', 'Calle Belgrano 450', 'IOMA', 'Presenta dificultades de movilidad.'),
    ('30000016', 'Calle Vieytes 780', 'PAMI', 'Requiere supervisión y asistencia diaria.')
) AS datos(dni, direccion, obra_social, observaciones)
INNER JOIN personas p ON p.dni = datos.dni;


-- ============================================================
-- 8. VINCULOS FAMILIARES
-- ============================================================

INSERT INTO vinculos_familiares (
    familiar_id,
    paciente_id,
    parentesco,
    es_contacto_principal,
    codigo_vinculacion,
    codigo_usado,
    expira_en,
    activo
)
SELECT
    f.id,
    pa.id,
    datos.parentesco,
    datos.contacto_principal,
    datos.codigo,
    TRUE,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    TRUE
FROM (
    VALUES
    ('30000008', '30000012', 'Hijo', TRUE, 'VINC-PRUEBA-001'),
    ('30000009', '30000013', 'Hija', TRUE, 'VINC-PRUEBA-002'),
    ('30000010', '30000014', 'Hijo', TRUE, 'VINC-PRUEBA-003'),
    ('30000011', '30000015', 'Hija', TRUE, 'VINC-PRUEBA-004'),
    ('30000009', '30000016', 'Sobrina', TRUE, 'VINC-PRUEBA-005')
) AS datos(dni_familiar, dni_paciente, parentesco, contacto_principal, codigo)
INNER JOIN personas pf ON pf.dni = datos.dni_familiar
INNER JOIN familiares f ON f.persona_id = pf.id
INNER JOIN personas pp ON pp.dni = datos.dni_paciente
INNER JOIN pacientes pa ON pa.persona_id = pp.id;


-- ============================================================
-- 9. TURNOS
-- Todos respetan la restricción hora_fin > hora_inicio.
-- ============================================================

INSERT INTO turnos (dia_semana, hora_inicio, hora_fin, activo)
VALUES
('lunes', '06:00', '14:00', TRUE),
('lunes', '14:00', '22:00', TRUE),
('martes', '06:00', '14:00', TRUE),
('martes', '14:00', '22:00', TRUE),
('miércoles', '06:00', '14:00', TRUE),
('miércoles', '14:00', '22:00', TRUE),
('jueves', '06:00', '14:00', TRUE),
('viernes', '14:00', '22:00', TRUE),
('sábado', '06:00', '14:00', TRUE),
('domingo', '06:00', '14:00', TRUE),
('domingo', '14:00', '22:00', TRUE);


-- ============================================================
-- 10. ASIGNACIONES
-- ============================================================

INSERT INTO asignaciones (
    turno_id,
    cuidador_id,
    paciente_id,
    activo
)
SELECT
    t.id,
    c.id,
    pa.id,
    TRUE
FROM (
    VALUES
    ('30000004', '30000012', 'lunes', '06:00'),
    ('30000005', '30000013', 'lunes', '14:00'),
    ('30000006', '30000014', 'martes', '06:00'),
    ('30000007', '30000015', 'martes', '14:00'),
    ('30000004', '30000016', 'miércoles', '06:00'),
    ('30000005', '30000012', 'jueves', '06:00'),
    ('30000006', '30000013', 'viernes', '14:00'),
    ('30000007', '30000014', 'sábado', '06:00')
) AS datos(dni_cuidador, dni_paciente, dia, hora)
INNER JOIN personas pc ON pc.dni = datos.dni_cuidador
INNER JOIN cuidadores c ON c.persona_id = pc.id
INNER JOIN personas pp ON pp.dni = datos.dni_paciente
INNER JOIN pacientes pa ON pa.persona_id = pp.id
INNER JOIN turnos t
    ON t.dia_semana = datos.dia
    AND t.hora_inicio = datos.hora::TIME;


-- ============================================================
-- 10.1. VALIDAR ASIGNACIONES
-- Deben haberse insertado las 8 asignaciones.
-- ============================================================

DO $$
DECLARE
    cantidad_asignaciones INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO cantidad_asignaciones
    FROM asignaciones;

    IF cantidad_asignaciones <> 8 THEN
        RAISE EXCEPTION
            'Se esperaban 8 asignaciones, pero se encontraron %.',
            cantidad_asignaciones;
    END IF;
END;
$$;


-- ============================================================
-- 11. MEDICAMENTOS
-- Cantidades ficticias para probar el inventario.
-- ============================================================

INSERT INTO medicamentos (nombre, presentacion, cantidad)
VALUES
('Paracetamol', 'Comprimidos 500 mg', 100),
('Losartán', 'Comprimidos 50 mg', 80),
('Omeprazol', 'Cápsulas 20 mg', 60),
('Metformina', 'Comprimidos 850 mg', 90),
('Aspirina', 'Comprimidos 100 mg', 120),
('Vitamina D', 'Cápsulas 1000 UI', 50),
('Ibuprofeno', 'Comprimidos 400 mg', 70);


-- ============================================================
-- 12. TRATAMIENTOS
-- Datos ficticios para probar el sistema.
-- No representan indicaciones médicas reales.
-- ============================================================

INSERT INTO tratamientos (
    paciente_id,
    medicamento_id,
    dosis,
    frecuencia,
    horario,
    desde,
    hasta,
    activa
)
SELECT
    pa.id,
    m.id,
    datos.dosis,
    datos.frecuencia,
    datos.horario,
    CURRENT_DATE - 10,
    NULL,
    TRUE
FROM (
    VALUES
    ('30000012', 'Paracetamol', 'Según indicación', 'Cada 8 horas', '08:00, 16:00, 00:00'),
    ('30000012', 'Losartán', 'Según indicación', 'Una vez al día', '09:00'),
    ('30000013', 'Omeprazol', 'Según indicación', 'Una vez al día', '08:00'),
    ('30000013', 'Aspirina', 'Según indicación', 'Una vez al día', '13:00'),
    ('30000014', 'Metformina', 'Según indicación', 'Dos veces al día', '09:00, 21:00'),
    ('30000015', 'Vitamina D', 'Según indicación', 'Una vez al día', '10:00'),
    ('30000015', 'Ibuprofeno', 'Según indicación', 'Cada 8 horas', '08:00, 16:00, 00:00'),
    ('30000016', 'Losartán', 'Según indicación', 'Una vez al día', '09:00')
) AS datos(dni_paciente, medicamento, dosis, frecuencia, horario)
INNER JOIN personas p ON p.dni = datos.dni_paciente
INNER JOIN pacientes pa ON pa.persona_id = p.id
INNER JOIN medicamentos m ON m.nombre = datos.medicamento;


-- ============================================================
-- 13. PARTES DIARIOS
-- ============================================================

INSERT INTO partes_diarios (
    asignacion_id,
    fecha,
    animo,
    alimentacion,
    descanso,
    higiene,
    novedades,
    observaciones
)
SELECT
    a.id,
    CURRENT_DATE - datos.dias_atras,
    datos.animo,
    datos.alimentacion,
    datos.descanso,
    datos.higiene,
    datos.novedades,
    datos.observaciones
FROM (
    VALUES
    ('30000004', '30000012', 'lunes', '06:00', 0, 'Bueno', 'Buena', 'Normal', 'Completa', 'Sin novedades.', 'Jornada tranquila.'),
    ('30000005', '30000013', 'lunes', '14:00', 1, 'Regular', 'Buena', 'Normal', 'Completa', 'Se realizó control de rutina.', 'Continuar observación.'),
    ('30000006', '30000014', 'martes', '06:00', 2, 'Bueno', 'Regular', 'Bueno', 'Completa', 'Participó de actividades recreativas.', 'Sin inconvenientes.'),
    ('30000007', '30000015', 'martes', '14:00', 3, 'Bueno', 'Buena', 'Regular', 'Completa', 'Necesitó asistencia para movilizarse.', 'Se brindó acompañamiento.')
) AS datos(dni_cuidador, dni_paciente, dia, hora, dias_atras, animo, alimentacion, descanso, higiene, novedades, observaciones)
INNER JOIN personas pc ON pc.dni = datos.dni_cuidador
INNER JOIN cuidadores c ON c.persona_id = pc.id
INNER JOIN personas pp ON pp.dni = datos.dni_paciente
INNER JOIN pacientes pa ON pa.persona_id = pp.id
INNER JOIN turnos t
    ON t.dia_semana = datos.dia
    AND t.hora_inicio = datos.hora::TIME
INNER JOIN asignaciones a
    ON a.turno_id = t.id
    AND a.cuidador_id = c.id
    AND a.paciente_id = pa.id;


-- ============================================================
-- 14. PAGOS
-- Se generan registros pagados, pendientes y vencidos.
-- El trigger actualizará automáticamente los pagados.
-- ============================================================

INSERT INTO pagos (
    paciente_id,
    periodo,
    monto,
    fecha_pago,
    medio_pago,
    estado,
    observaciones
)
SELECT
    pa.id,
    datos.periodo,
    datos.monto,
    datos.fecha_pago,
    datos.medio_pago,
    datos.estado,
    datos.observaciones
FROM (
    VALUES
    ('30000012', (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months')::DATE, 350000.00, (CURRENT_DATE - 45)::DATE, 'transferencia', 'pagado', 'Pago realizado por transferencia.'),
    ('30000013', (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE, 320000.00, (CURRENT_DATE - 20)::DATE, 'efectivo', 'pagado', 'Pago recibido en administración.'),
    ('30000014', DATE_TRUNC('month', CURRENT_DATE)::DATE, 380000.00, NULL::DATE, NULL, 'pendiente', 'Pendiente de pago.'),
    ('30000015', (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE, 340000.00, NULL::DATE, NULL, 'vencido', 'Pago pendiente del período anterior.'),
    ('30000016', DATE_TRUNC('month', CURRENT_DATE)::DATE, 360000.00, NULL::DATE, NULL, 'pendiente', 'A la espera de transferencia.')
) AS datos(dni_paciente, periodo, monto, fecha_pago, medio_pago, estado, observaciones)
INNER JOIN personas p ON p.dni = datos.dni_paciente
INNER JOIN pacientes pa ON pa.persona_id = p.id;


-- ============================================================
-- 15. VALIDACIONES FINALES
-- ============================================================

DO $$
DECLARE
    total_personas INTEGER;
    total_usuarios INTEGER;
    total_pacientes INTEGER;
    total_turnos INTEGER;
    total_asignaciones INTEGER;
    total_medicamentos INTEGER;
    total_tratamientos INTEGER;
    total_partes INTEGER;
    total_pagos INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_personas FROM personas;
    SELECT COUNT(*) INTO total_usuarios FROM usuarios;
    SELECT COUNT(*) INTO total_pacientes FROM pacientes;
    SELECT COUNT(*) INTO total_turnos FROM turnos;
    SELECT COUNT(*) INTO total_asignaciones FROM asignaciones;
    SELECT COUNT(*) INTO total_medicamentos FROM medicamentos;
    SELECT COUNT(*) INTO total_tratamientos FROM tratamientos;
    SELECT COUNT(*) INTO total_partes FROM partes_diarios;
    SELECT COUNT(*) INTO total_pagos FROM pagos;

    RAISE NOTICE 'Personas: %', total_personas;
    RAISE NOTICE 'Usuarios: %', total_usuarios;
    RAISE NOTICE 'Pacientes: %', total_pacientes;
    RAISE NOTICE 'Turnos: %', total_turnos;
    RAISE NOTICE 'Asignaciones: %', total_asignaciones;
    RAISE NOTICE 'Medicamentos: %', total_medicamentos;
    RAISE NOTICE 'Tratamientos: %', total_tratamientos;
    RAISE NOTICE 'Partes diarios: %', total_partes;
    RAISE NOTICE 'Pagos: %', total_pagos;

    IF total_personas <> 16
       OR total_usuarios <> 11
       OR total_pacientes <> 5
       OR total_turnos <> 11
       OR total_asignaciones <> 8
       OR total_medicamentos <> 7
       OR total_tratamientos <> 8
       OR total_partes <> 4
       OR total_pagos <> 5
    THEN
        RAISE EXCEPTION
            'Las cantidades de datos iniciales no coinciden con las esperadas.';
    END IF;
END;
$$;


COMMIT;

-- ============================================================
-- FIN DE LOS DATOS INICIALES DE PRUEBA
-- ============================================================
