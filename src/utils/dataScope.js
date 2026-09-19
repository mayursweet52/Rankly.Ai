/**
 * Applies data scope for RBAC filtering
 */
function applyDataScope(req, baseWhere = {}, employeeIdField = 'id', userIdField = 'userId') {
  const scope = req.rbac?.dataScope || 'NO_DATA';

  if (scope === 'ALL_DATA') return baseWhere;
  if (scope === 'NO_DATA') return { ...baseWhere, id: 'NO_ACCESS_ID' }; // impossible ID

  if (scope === 'MY_DATA') {
    return { ...baseWhere, [userIdField]: req.user.id };
  }

  if (scope === 'SUBORDINATES') {
    return {
      ...baseWhere,
      managerId: req.user.employeeId // Assumes req.user has employeeId populated somewhere
    };
  }

  if (scope === 'MY_DATA_AND_SUBORDINATES') {
    return {
      ...baseWhere,
      OR: [
        { [userIdField]: req.user.id },
        { managerId: req.user.employeeId }
      ]
    };
  }

  return baseWhere;
}

module.exports = { applyDataScope };
