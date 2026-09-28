import test from 'node:test';
import assert from 'node:assert/strict';
import { usePermissions } from '../src/usePermissions.js';

test('usePermissions valida roles e groups reativamente a partir da store', () => {
  const mockStore = {
    roles: ['INVENTARIO_MANAGE_EQUIPAMENTO', 'INVENTARIO_VIEW_EQUIPAMENTO'],
    groups: ['ADMIN', 'TI']
  };

  const permissions = usePermissions(mockStore);

  assert.equal(permissions.hasRole('INVENTARIO_MANAGE_EQUIPAMENTO'), true);
  assert.equal(permissions.hasRole('INVENTARIO_DELETE'), false);

  assert.equal(permissions.hasAnyRole(['INVENTARIO_DELETE', 'INVENTARIO_VIEW_EQUIPAMENTO']), true);
  assert.equal(permissions.hasAnyRole(['INVENTARIO_DELETE']), false);

  assert.equal(permissions.hasAllRoles(['INVENTARIO_MANAGE_EQUIPAMENTO', 'INVENTARIO_VIEW_EQUIPAMENTO']), true);
  assert.equal(permissions.hasAllRoles(['INVENTARIO_MANAGE_EQUIPAMENTO', 'INVENTARIO_DELETE']), false);

  assert.equal(permissions.hasGroup('ti'), true);
  assert.equal(permissions.hasGroup('rh'), false);

  assert.equal(permissions.hasAnyGroup(['rh', 'admin']), true);
  assert.equal(permissions.hasAllGroups(['admin', 'ti']), true);
});

test('usePermissions trata estados nulos ou vazios de forma segura', () => {
  const permissions = usePermissions({ roles: null, groups: null });

  assert.equal(permissions.hasRole('ADMIN'), false);
  assert.equal(permissions.hasAnyRole(['ADMIN']), false);
  assert.equal(permissions.hasAnyRole([]), true);
  assert.equal(permissions.hasAllRoles(['ADMIN']), false);
  assert.equal(permissions.hasAllRoles([]), true);
  assert.equal(permissions.hasGroup('ADMIN'), false);
  assert.equal(permissions.hasAnyGroup(['ADMIN']), false);
  assert.equal(permissions.hasAnyGroup([]), true);
  assert.equal(permissions.hasAllGroups(['ADMIN']), false);
  assert.equal(permissions.hasAllGroups([]), true);
});
