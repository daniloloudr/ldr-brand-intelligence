import TextField from '@mui/material/TextField'

export function Input({ label, value, onChange, placeholder, required, type = 'text', autoFocus, autoComplete }) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      size="small"
      sx={{ mb: 2.5 }}
    />
  )
}
