import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAccessItem,
  checkRole,
  checkAnyRole,
  checkAllRoles,
  checkGroup,
  checkAnyGroup,
  checkAllGroups
} from '../src/authorization.js';

test('normalizeAccessItem formata corretamente caminhos e caixa alta', () => {
  assert.equal(normalizeAccessItem('admin'), 'ADMIN');
  assert.equal(normalizeAccessItem('/grupo/subgrupo/gerente/'), 'GERENTE');
  assert.equal(normalizeAccessItem(null), '');
  assert.equal(normalizeAccessItem(undefined), '');
  assert.equal(normalizeAccessItem(123), '');
});

test('checkRole valida roles individuais considerando normalizacao', () => {
  const userRoles = ['INVENTARIO_MANAGE_EQUIPAMENTO', '/app/INVENTARIO_VIEW_EQUIPAMENTO'];

  assert.equal(checkRole(userRoles, 'INVENTARIO_MANAGE_EQUIPAMENTO'), true);
  assert.equal(checkRole(userRoles, 'inventario_manage_equipamento'), true);
  assert.equal(checkRole(userRoles, 'INVENTARIO_VIEW_EQUIPAMENTO'), true);
  assert.equal(checkRole(userRoles, 'INVENTARIO_DELETE'), false);
  assert.equal(checkRole([], 'INVENTARIO_MANAGE_EQUIPAMENTO'), false);
  assert.equal(checkRole(null, 'INVENTARIO_MANAGE_EQUIPAMENTO'), false);
});

test('checkAnyRole valida lista de roles no modo any', () => {
  const userRoles = ['ROLE_A', 'ROLE_B'];

  assert.equal(checkAnyRole(userRoles, ['ROLE_A']), true);
  assert.equal(checkAnyRole(userRoles, ['ROLE_C', 'ROLE_B']), true);
  assert.equal(checkAnyRole(userRoles, ['ROLE_C', 'ROLE_D']), false);
  assert.equal(checkAnyRole(userRoles, []), true);
  assert.equal(checkAnyRole(userRoles, null), true);
});

test('checkAllRoles valida lista de roles no modo all', () => {
  const userRoles = ['ROLE_A', 'ROLE_B'];

  assert.equal(checkAllRoles(userRoles, ['ROLE_A']), true);
  assert.equal(checkAllRoles(userRoles, ['ROLE_A', 'ROLE_B']), true);
  assert.equal(checkAllRoles(userRoles, ['ROLE_A', 'ROLE_C']), false);
  assert.equal(checkAllRoles(userRoles, []), true);
  assert.equal(checkAllRoles(userRoles, null), true);
});

test('checkGroup valida pertencimento a grupos', () => {
  const userGroups = ['/admin/ti', 'financeiro'];

  assert.equal(checkGroup(userGroups, 'ti'), true);
  assert.equal(checkGroup(userGroups, 'FINANCEIRO'), true);
  assert.equal(checkGroup(userGroups, 'rh'), false);
  assert.equal(checkGroup([], 'ti'), false);
  assert.equal(checkGroup(null, 'ti'), false);
});

test('checkAnyGroup e checkAllGroups validam conjuntos de grupos', () => {
  const userGroups = ['ADMIN', 'TI'];

  assert.equal(checkAnyGroup(userGroups, ['TI', 'RH']), true);
  assert.equal(checkAnyGroup(userGroups, ['RH', 'FINANCEIRO']), false);
  assert.equal(checkAnyGroup(userGroups, []), true);

  assert.equal(checkAllGroups(userGroups, ['ADMIN', 'TI']), true);
  assert.equal(checkAllGroups(userGroups, ['ADMIN', 'RH']), false);
  assert.equal(checkAllGroups(userGroups, []), true);
});
