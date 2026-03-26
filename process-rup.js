// process-rup.js - Fixed untuk nama file baru
const fs = require('fs');
const path = require('path');

const DATA_PATH = 'data';
const FILES = {
    satker: 'satker.json',
    penyedia: 'penyedia.json', 
    swakelola: 'swakelola.json',
    program: 'program.json',
    pagu: 'pagu.json'
};

// Load data
const rawData = {};
for (const [key, file] of Object.entries(FILES)) {
    const filePath = path.join(DATA_PATH, file);
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            rawData[key] = JSON.parse(content === '' ? '[]' : content);
        } else {
            rawData[key] = [];
        }
    } catch {
        rawData[key] = [];
    }
}

// Process logic sama seperti sebelumnya...
const satkerMap = new Map();
rawData.satker.forEach(s => {
    if (s.id_satker && s.nama_satker) {
        satkerMap.set(s.id_satker, {
            id: s.id_satker,
            'Satuan Kerja': s.nama_satker.trim(),
            'Kode Satker': s.kode_satker || s.id_satker
        });
    }
});

const paguMap = new Map();
rawData.pagu.forEach(p => {
    if (p.id_satker && p.nilai_anggaran) {
        const id = p.id_satker;
        paguMap.set(id, (paguMap.get(id) || 0) + parseFloat(p.nilai_anggaran));
    }
});

const rupPenyediaMap = new Map();
rawData.penyedia.forEach(p => {
    if (p.id_satker && p.nilai_pagu) {
        const id = p.id_satker;
        rupPenyediaMap.set(id, (rupPenyediaMap.get(id) || 0) + parseFloat(p.nilai_pagu));
    }
});

const rupSwakelolaMap = new Map();
rawData.swakelola.forEach(s => {
    if (s.id_satker && s.nilai_pagu) {
        const id = s.id_satker;
        rupSwakelolaMap.set(id, (rupSwakelolaMap.get(id) || 0) + parseFloat(s.nilai_pagu));
    }
});

// Generate rekap
const rekapList = [];
for (const [id, info] of satkerMap) {
    const pagu = paguMap.get(id) || 0;
    if (pagu === 0) continue;
    
    const penyedia = rupPenyediaMap.get(id) || 0;
    const swakelola = rupSwakelolaMap.get(id) || 0;
    const totalRup = penyedia + swakelola;
    const persentase = Math.round((totalRup / pagu) * 100 * 10) / 10;
    
    rekapList.push({
        id,
        'Satuan Kerja': info['Satuan Kerja'],
        'Kode Satker': info['Kode Satker'],
        'Pagu Program': pagu,
        'RUP Penyedia': penyedia,
        'RUP Swakelola': swakelola,
        'Total RUP Terumumkan': totalRup,
        'Persentase': persentase
    });
}

rekapList.sort((a, b) => b.Persentase - a.Persentase);

// Save
fs.writeFileSync(path.join(DATA_PATH, 'rekap.json'), JSON.stringify(rekapList, null, 2));
console.log(`✅ Generated ${rekapList.length} satker`);
