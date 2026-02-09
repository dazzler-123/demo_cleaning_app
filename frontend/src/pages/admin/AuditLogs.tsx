import { useEffect, useState } from 'react';
import { auditApi, type AuditLogEntry } from '@/api/endpoints';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Box from '@mui/material/Box';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CompactTable from '@/components/CompactTable';
import Button from '@/components/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import HistoryIcon from '@mui/icons-material/History';
import InboxIcon from '@mui/icons-material/Inbox';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    auditApi
      .list({ page, limit: 25 })
      .then((res) => {
        setLogs(res.data.items);
        setTotal(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  const userName = (e: AuditLogEntry) =>
    e.userId && typeof e.userId === 'object' ? e.userId.name : '—';

  return (
    <Box>
      <PageHeader title="Audit Logs" subtitle="History of actions and changes" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          {logs.length === 0 ? (
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
                No audit logs yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activity logs will appear here
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <CompactTable>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Resource</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>Resource ID</TableCell>
                    </TableRow>
                  </TableHead>
                    <TableBody>
                      {logs.map((e) => (
                        <TableRow
                          key={e._id}
                          sx={{
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <TableCell>{new Date(e.createdAt).toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{userName(e)}</TableCell>
                          <TableCell>{e.action}</TableCell>
                          <TableCell>{e.resource}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{e.resourceId ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </CompactTable>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {logs.map((e) => (
                    <Paper
                      key={e._id}
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
                          <Typography variant="body2" fontWeight={600}>
                            {e.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(e.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            User
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {userName(e)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Resource
                          </Typography>
                          <Typography variant="body2">{e.resource}</Typography>
                        </Box>
                        {e.resourceId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Resource ID
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                              {e.resourceId}
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {new Date(e.createdAt).toLocaleTimeString()}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}
          {total > 25 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, mb: 1 }}>
              <Pagination
                count={Math.ceil(total / 25)}
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
    </Box>
  );
}
