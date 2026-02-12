import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadsApi } from '@/api/endpoints';
import type { ClientInfo, Location, CleaningDetails, Resources, LeadType, LeadStatus } from '@/types';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { getStatusChipProps } from '@/utils/statusColors';

const emptyClient: ClientInfo = {
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
};

const emptyLocation: Location = {
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const emptyCleaning: CleaningDetails = {
  cleaningType: '',
  category: '',
  areaSize: '0',
  rooms: undefined,
  washrooms: undefined,
  floorType: '',
  frequency: '',
};

const emptyResources: Resources = {
  materials: [],
  machines: [],
  safetyGear: [],
  powerAvailable: undefined,
  waterAvailable: undefined,
};



export default function LeadForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [client, setClient] = useState<ClientInfo>(emptyClient);
  const [location, setLocation] = useState<Location>(emptyLocation);
  const [cleaningDetails, setCleaningDetails] = useState<CleaningDetails>(emptyCleaning);
  const [slaPriority, setSlaPriority] = useState('medium');
  const [leadType, setLeadType] = useState<LeadType | ''>('');
  const [status, setStatus] = useState('created');
  const [quotedAmount, setQuotedAmount] = useState<number | undefined>(undefined);
  const [confirmedAmount, setConfirmedAmount] = useState<number | undefined>(undefined);
  const [resources, setResources] = useState<Resources>(emptyResources);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    leadsApi
      .get(id)
      .then((res) => {
        const d = res.data;
        setClient(d.client);
        setLocation(d.location);
        setCleaningDetails(d.cleaningDetails);
        setSlaPriority(d.slaPriority ?? 'medium');
        setLeadType(d.leadType ?? '');
        setStatus(d.status ?? 'draft');
        setImages(d.images ?? []);
        setQuotedAmount(d.quotedAmount);
        setConfirmedAmount(d.confirmedAmount);
        if (d.resources) {
          setResources({
            materials: d.resources.materials ?? [],
            machines: d.resources.machines ?? [],
            safetyGear: d.resources.safetyGear ?? [],
            powerAvailable: d.resources.powerAvailable,
            waterAvailable: d.resources.waterAvailable,
          });
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 500 * 1024; // 500KB in bytes
    const oversizedFiles: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > MAX_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      setError(`The following image(s) exceed 500KB limit: ${oversizedFiles.join(', ')}. Please select smaller images.`);
      return;
    }

    if (validFiles.length === 0) return;

    const newPreviews: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
          setImageFiles((prev) => [...prev, ...validFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setImages((prev) => prev.filter((url) => url !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadingImages(true);
    try {
      let uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const uploadResult = await leadsApi.uploadImages(imageFiles);
        uploadedImageUrls = uploadResult.images;
      }
      const allImages = [...images, ...uploadedImageUrls];

      const payload = {
        client,
        location,
        cleaningDetails,
        slaPriority,
        ...(leadType ? { leadType } : {}),
        ...(allImages.length > 0 ? { images: allImages } : {}),
        ...(isEdit ? { status: status as LeadStatus } : {}),
        ...(quotedAmount !== undefined ? { quotedAmount } : {}),
        ...(confirmedAmount !== undefined ? { confirmedAmount } : {}),
        resources: {
          materials: resources.materials?.length ? resources.materials : undefined,
          machines: resources.machines?.length ? resources.machines : undefined,
          safetyGear: resources.safetyGear?.length ? resources.safetyGear : undefined,
          powerAvailable: resources.powerAvailable,
          waterAvailable: resources.waterAvailable,
        },
      };
      if (isEdit) {
        await leadsApi.update(id!, payload);
        navigate('/admin/leads');
      } else {
        await leadsApi.create(payload);
        navigate('/admin/leads');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Lead' : 'New Lead'}
        subtitle={isEdit ? 'Update job and client details' : 'Add a new cleaning job lead'}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isEdit && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Current status:</Typography>
          <Chip label={status} size="small" {...getStatusChipProps(status)} />
        </Box>
      )}
      {isEdit && status === 'completed' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Completed leads cannot be edited. Use the button below to go back to the list.
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Client Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company/Buliding Name" value={client.companyName} onChange={(e) => setClient((c) => ({ ...c, companyName: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Contact person" value={client.contactPerson} onChange={(e) => setClient((c) => ({ ...c, contactPerson: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" type="tel" value={client.phone} onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" value={client.email} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} />
            </Grid>
          </Grid>
        </Card>
        <Card sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Location</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Street Address" value={location.address} onChange={(e) => setLocation((l) => ({ ...l, address: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="City" value={location.city} onChange={(e) => setLocation((l) => ({ ...l, city: e.target.value }))} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Country" value={location.state} onChange={(e) => setLocation((l) => ({ ...l, state: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Pass-code" value={location.pincode} onChange={(e) => setLocation((l) => ({ ...l, pincode: e.target.value }))} />
            </Grid>
          </Grid>
        </Card>
        <Card sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Cleaning Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Cleaning type"
                value={cleaningDetails.cleaningType}
                onChange={(e) => setCleaningDetails((c) => ({ ...c, cleaningType: e.target.value }))}
                required
              >
                <MenuItem value="Office">Office</MenuItem>
                <MenuItem value="Industrial">Industrial</MenuItem>
                <MenuItem value="Residential">Residential</MenuItem>
                <MenuItem value="Commercial">Commercial</MenuItem>
                <MenuItem value="Healthcare">Healthcare</MenuItem>
                <MenuItem value="Educational">Educational</MenuItem>
                <MenuItem value="Retail">Retail</MenuItem>
                <MenuItem value="Warehouse">Warehouse</MenuItem>
                <MenuItem value="Restaurant">Restaurant</MenuItem>
                <MenuItem value="Hotel">Hotel</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Category"
                value={cleaningDetails.category}
                onChange={(e) => setCleaningDetails((c) => ({ ...c, category: e.target.value }))}
                required
              >
                <MenuItem value="Commercial">Commercial</MenuItem>
                <MenuItem value="Deep Clean">Deep Clean</MenuItem>
                <MenuItem value="Regular Maintenance">Regular Maintenance</MenuItem>
                <MenuItem value="Post-Construction">Post-Construction</MenuItem>
                <MenuItem value="Move-In/Move-Out">Move-In/Move-Out</MenuItem>
                <MenuItem value="Carpet Cleaning">Carpet Cleaning</MenuItem>
                <MenuItem value="Window Cleaning">Window Cleaning</MenuItem>
                <MenuItem value="Floor Care">Floor Care</MenuItem>
                <MenuItem value="Sanitization">Sanitization</MenuItem>
                <MenuItem value="Disinfection">Disinfection</MenuItem>
                <MenuItem value="Gutter Cleaning">Gutter Cleaning</MenuItem>
                <MenuItem value="Roof Cleaning">Roof Cleaning</MenuItem>

              </TextField>
            </Grid>
          </Grid>
        </Card>
        <Card sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Images</Typography>
          <Box sx={{ mb: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages || loading}
            >
              <ImageIcon sx={{ mr: 1, fontSize: 20 }} />
              {uploadingImages ? 'Uploading...' : 'Select Images'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You can select multiple images (max 10, 500KB each)
            </Typography>
          </Box>
          {(images.length > 0 || imagePreviews.length > 0) && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {images.map((imageUrl, index) => (
                <Grid item xs={6} sm={4} md={3} key={`existing-${index}`}>
                  <Box sx={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
                    <Box
                      component="img"
                      src={imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`}
                      alt={`Upload ${index + 1}`}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveExistingImage(imageUrl)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
              {imagePreviews.map((preview, index) => (
                <Grid item xs={6} sm={4} md={3} key={`preview-${index}`}>
                  <Box sx={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
                    <Box
                      component="img"
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveImage(index)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>
        <Card sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Amount</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quoted Amount"
                type="number"
                value={quotedAmount ?? ''}
                onChange={(e) => setQuotedAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText="Initial service quote for this lead"
              />
            </Grid>
            {status === 'confirm' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirmed Amount"
                  type="number"
                  value={confirmedAmount ?? ''}
                  onChange={(e) => setConfirmedAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Final confirmed amount after agreement"
                  required={status === 'confirm'}
                />
              </Grid>
            )}
          </Grid>
        </Card>
        <Card sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="SLA Priority" value={slaPriority} onChange={(e) => setSlaPriority(e.target.value)}>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Lead Type" value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType | '')}>
                <MenuItem value="">Select Lead Type</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="website">Website</MenuItem>
                <MenuItem value="referral">Referral</MenuItem>
                <MenuItem value="walk_in">Walk In</MenuItem>
                <MenuItem value="phone_call">Phone Call</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            {isEdit && (
              <Grid item xs={12} sm={6}>
                <TextField 
                  select 
                  fullWidth 
                  label="Status" 
                  value={status} 
                  onChange={(e) => {
                    setStatus(e.target.value);
                    // Clear confirmedAmount if status changes away from 'confirm'
                    if (e.target.value !== 'confirm') {
                      setConfirmedAmount(undefined);
                    }
                  }}
                >
                  <MenuItem value="created">Created</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="confirm">Confirm</MenuItem>
                  <MenuItem value="follow_up">Follow Up</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </Card>
        <Stack direction="row" spacing={2}>
          {!(isEdit && status === 'completed') && (
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading || uploadingImages ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/leads')}>
            {isEdit && status === 'completed' ? 'Back to list' : 'Cancel'}
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
