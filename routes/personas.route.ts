import {Router} from 'express';
import {crear, obtener, listar, actualizar} from '../controllers/personas.controller';
import {verificarToken} from '../middlewares/auth.middleware';
import {verificarRol} from '../middlewares/rol.middleware';
import {validarPersona} from '../validators/persona.validator';

const router = Router();

router.post('/', verificarToken, verificarRol('administrador', 'secretaria'), validarPersona, crear);
router.get('/', verificarToken, verificarRol('administrador', 'secretaria'), listar);
router.get('/:id', verificarToken, verificarRol('administrador', 'secretaria'), obtener);
router.put('/:id', verificarToken, verificarRol('administrador', 'secretaria'), validarPersona, actualizar);

export default router;