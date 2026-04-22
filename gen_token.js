import fs from 'fs';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import fetch from 'node-fetch'; // wait, node 18+ has native fetch, but form-data might need special handling. Let's use native fetch with Blob/File or just use curl if we have token!

const token = jwt.sign({ id: 1, email: 'diasizzat222@gmail.com' }, 'rahasia_super_aman_ganti_ini_di_prod', { expiresIn: '1d' });
console.log('TOKEN:', token);
