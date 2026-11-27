import {Router} from 'express';
import {crear, listar, obtener, actualizar, desactivar, activar} from '../controllers/usuarios.controller';
import {verificarToken} from '../middlewares/auth.middleware';
import {verificarRol} from '../middlewares/rol.middleware';
import {limitarSecretariaACuidadoras} from '../middlewares/secretaria-cuidadoras.middleware';
import {validarUsuario} from '../validators/usuario.validator';
import {validarActualizacionUsuario} from '../validators/usuario-actualizar.validator';

const router = Router();

router.post('/', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, validarUsuario, crear);
router.get('/', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, listar);
router.get('/:id', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, obtener);
router.put('/:id', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, validarActualizacionUsuario, actualizar);
router.patch('/:id/desactivar', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, desactivar);
router.patch('/:id/activar', verificarToken, verificarRol('administrador', 'secretaria'), limitarSecretariaACuidadoras, activar);

export default router;