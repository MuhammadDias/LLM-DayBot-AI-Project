import fs from 'fs';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 1, email: 'test@test.com' }, 'rahasia_super_aman_ganti_ini_di_prod', { expiresIn: '1d' });

async function upload() {
  // Create dummy text file disguised as PDF
  fs.writeFileSync('dummy.pdf', 'dummy content to test if parsing fails properly or throws 500');
  
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync('dummy.pdf')]), 'dummy.pdf');

  const res = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  console.log('Status:', res.status);
  console.log('Response:', await res.text());
}

upload();
