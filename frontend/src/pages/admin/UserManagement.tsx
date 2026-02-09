import { useEffect, useState } from 'react';
import { usersApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import { ROLES } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable from '@/components/CompactTable';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import PeopleIcon from '@mui/icons-material/People';
import InboxIcon from '@mui/icons-material/Inbox';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';

function loadUsers(setUsers: (u: User[]) => void, setTotal: (n: number) => void, setLoading: (b: boolean) => void, setError: (s: string) => void, page: number) {
  setLoading(true);
  usersApi
    .list({ page, limit: 15 })
    .then((res) => {
      setUsers(res.data.items);
      setTotal(res.data.total);
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function UserManagement() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<string>(ROLES.AGENT);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const reload = () => loadUsers(setUsers, setTotal, setLoading, setError, page);

  useEffect(() => {
    loadUsers(setUsers, setTotal, setLoading, setError, page);
  }, [page]);

  const handleOpenCreate = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole(isSuperAdmin ? ROLES.ADMIN : ROLES.AGENT);
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError('Name, email and password are required.');
      return;
    }
    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }
    setCreateError('');
    setCreateLoading(true);
    try {
      await usersApi.create({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      setCreateOpen(false);
      reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle={isSuperAdmin ? 'Manage admins and agents' : 'Create agents only (admin cannot create other admins)'}
        action={
          <Button onClick={handleOpenCreate}>{isSuperAdmin ? 'Create user' : 'Create agent'}</Button>
        }
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PeopleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="body2" color="text.secondary">
          Manage user accounts and roles
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Card>
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        </Card>
      ) : (
        <Card>
          {users.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                gap: 1,
              }}
            >
              <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No users found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first user to get started
              </Typography>
              <Button onClick={handleOpenCreate} variant="contained" sx={{ mt: 2 }}>
                {isSuperAdmin ? 'Create user' : 'Create agent'}
              </Button>
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <CompactTable>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u._id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Chip label={u.role} size="small" variant="outlined" /></TableCell>
                          <TableCell>
                            <Typography sx={{ color: u.status === 'active' ? '#22c55e' : u.status === 'suspended' ? '#ef4444' : '#E7E9F0', fontWeight: 500 }}>
                              {u.status}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </CompactTable>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {users.map((u) => (
                    <Paper
                      key={u._id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 2px 8px rgba(5, 23, 71, 0.1)',
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="h6" fontWeight={600}>
                            {u.name}
                          </Typography>
                          <Chip label={u.role} size="small" variant="outlined" />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body2">{u.email}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Typography sx={{ color: u.status === 'active' ? '#22c55e' : u.status === 'suspended' ? '#ef4444' : '#E7E9F0', fontWeight: 500 }}>
                            {u.status}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}
          {total > 15 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, mb: 1 }}>
              <Pagination
                count={Math.ceil(total / 15)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                size="medium"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Card>
      )}

      <Dialog open={createOpen} onClose={() => !createLoading && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              fullWidth
              label="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              required
              helperText="At least 6 characters"
            />
            <TextField
              select
              fullWidth
              label="Role"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              disabled={!isSuperAdmin}
              helperText={!isSuperAdmin ? 'Admin can only create agents' : undefined}
            >
              <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>
              <MenuItem value={ROLES.AGENT}>Agent</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createLoading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={createLoading}>
            {createLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
