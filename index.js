require('dotenv').config()
const { GoogleGenAI, Type } = require('@google/genai');
const express = require('express');
const cors = require('cors')
const fs = require('fs');
const app = express();
const port=process.env.PORT


app.use(express.json({limit:'5mb'}))
app.use(cors({
    origin:['http://localhost:5173','http://localhost:3001'],
    credentials:true,
    methods:['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders:['Content-type','Authorization']
}))
const apiKey = process.env.GEMIN_API_KEY;
const ai = new GoogleGenAI({apiKey:apiKey})

app.get('/api',(req,res)=>res.send('api ok..!'))

app.post('/api/genai',async(req,res)=>{
    const {filePath} = req.body;
    const mimeType = 'image/jpeg'
    const fileBuffer = await fetch(filePath)
    const arrayBuffer = await fileBuffer.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const promptText = 'Ekstrak data KK dan tabel anggota dari gambar ini sesuai dengan skema JSON.'
    const jsonProp = 
        {
            no_kk: { type: Type.STRING, description: '16 digit Nomor Kartu Keluarga' },
            nama_kepala_keluarga: { type: Type.STRING },
            alamat: { type: Type.STRING },
            rt_rw: { type: Type.STRING, description: 'Contoh: 003/001' },
            desa_kelurahan: { type: Type.STRING },
            kecamatan: { type: Type.STRING },
            kabupaten_kota: { type: Type.STRING },
            provinsi: { type: Type.STRING },
            anggota_keluarga: {
            type: Type.ARRAY,
            description: 'Daftar semua orang yang tercantum dalam tabel Kartu Keluarga',
            items: 
            {
                type: Type.OBJECT,
                properties: 
                {
                        nama_lengkap: { type: Type.STRING },
                    nik: { type: Type.STRING, description: '16 digit Nomor Induk Kependudukan' },
                    jenis_kelamin: { type: Type.STRING, description: 'LAKI-LAKI atau PEREMPUAN' },
                    tempat_lahir: { type: Type.STRING },
                    tanggal_lahir: { type: Type.STRING, description: 'Format YYYY-MM-DD' },
                    status_hubungan: { type: Type.STRING, description: 'KEPALA KELUARGA, ISTERI, ANAK, dll' }
                },
                required: ['nama_lengkap', 'nik', 'status_hubungan']
            }
        }
    }

    // const promptText = `Anda adalah AI OCR khusus dokumen Indonesia. Tugas Anda adalah membaca gambar Kartu Keluarga (KK) dan mengekstrak seluruh datanya secara akurat.

    //     Ekstrak dua bagian utama:
    //     1. Data Utama KK (No KK, Alamat, dll).
    //     2. Daftar Anggota Keluarga (Data dari tabel di dalam KK). Masukkan semua orang yang terdaftar di tabel, termasuk Kepala Keluarga, Istri, Anak, atau kerabat lainnya.

    //     ATURAN KETAT:
    //     - Nomor KK dan NIK harus berupa string berisikan angka murni sepanjang 16 digit.
    //     - Pastikan urutan baris anggota keluarga sesuai dengan yang ada di tabel dokumen.
    //     `;
    try{
        const response = await ai.models.generateContent({
            model:'gemini-3.5-flash-lite',
            contents:[
                {
                    inlineData:{
                        mimeType:mimeType,
                        data:base64Data
                    }
                },
                {
                    text: promptText
                }
            ],
            config:{
                responseMimeType:'application/json',
                responseJsonSchema:{
                    type:Type.OBJECT,
                    properties:jsonProp,
                    required:['no_kk','anggota_keluarga']
                },
                thinkingConfig:{thinkingLevel:'low'}
            }
        })
        console.log(JSON.stringify(response.text))
        return res.json({success:true,message:'data berhasil diurai',data:response.text})
    }catch(error){
        console.log(error)
        return res.status(500).json({success:false,error:error})}
})

app.listen(port,()=>console.log('berjalan di port : '+port))