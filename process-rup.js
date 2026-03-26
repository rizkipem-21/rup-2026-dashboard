// process-rup.js - Processor RUP 2026 D228 untuk GitHub Actions
// Auto-generate rekap.json dari 5 file Legacy INAPROC

const fs = require('fs');
const path = require('path');

console.log('🤖 === RUP 2026 D228 PROCESSOR ===');
console.log('📅 ' + new Date().toLocaleString('id-ID'));

const DATA_PATH = 'data';

// Pastikan folder data ada
if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(DATA_PATH, { recursive: true });
    console.log('📁 Created folder:', DATA_PATH);
}

// File mapping
const FILES = {
    satker: 'Legacy_rup_master-satker_2026.json',
    penyedia: 'Legacy_rup_paket-penyedia-terumumkan_2026.json',
    swakelola: 'Legacy_rup_paket-swakelola-terumumkan_2026.json',
    program: 'Legacy_rup_program-master_2026.json',
    pagu: 'Legacy_rup_struktur-anggaran-pd_2026.json'
};

// Load semua raw data
const rawData = {};
let totalRecords = 0;

console.log('\n📥 Loading raw data...');
for (const [key, filename] of Object.entries(FILES)) {
    const filePath = path.join(DATA_PATH, filename);
    
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            rawData[key] = content === '' || content === '[]' ? [] : JSON.parse(content);
            console.log(`✅ ${filename}: ${rawData[key].length.toLocaleString()} records`);
            totalRecords += rawData[key].length;
        } else {
            console.log(`⚠️  ${filename}: File not found (using empty array)`);
            rawData[key] = [];
        }
    } catch (error) {
        console.log(`❌ ${filename}: Parse error - ${error.message}`);
        rawData[key] = [];
    }
}

console.log(`📊 Total raw records: ${totalRecords.toLocaleString()}\n`);

// ================================
// PROCESSING LOGIC
// ================================

console.log('🔄 Processing data...');

// 1. SATKER MASTER - Base info
const satkerMap = new Map();
rawData.satker.forEach(satker => {
    if (satker.id_satker && satker.nama_satker) {
        satkerMap.set(satker.id_satker, {
            id: satker.id_satker,
            'Satuan Kerja': satker.nama_satker.trim(),
            'Kode Satker': satker.kode_satker || satker.id_satker
        });
    }
});
console.log(`🏢 Unique satker: ${satkerMap.size}`);

// 2. PAGU ANGGARAN - Pagu Program
const paguMap = new Map();
rawData.pagu?.forEach(item => {
    if (item.id_satker && item.nilai_anggaran) {
        const id = item.id_satker;
        const nilai = parseFloat(item.nilai_anggaran) || 0;
        paguMap.set(id, (paguMap.get(id) || 0) + nilai);
    }
});

// 3. RUP PENYEDIA
const rupPenyediaMap = new Map();
rawData.penyedia?.forEach(paket => {
    if (paket.id_satker && paket.nilai_pagu) {
        const id = paket.id_satker;
        const nilai = parseFloat(paket.nilai_pagu) || 0;
        rupPenyediaMap.set(id, (rupPenyediaMap.get(id) || 0) + nilai);
    }
});

// 4. RUP SWAKELOLA
const rupSwakelolaMap = new Map();
rawData.swakelola?.forEach(paket => {
    if (paket.id_satker && paket.nilai_pagu) {
        const id = paket.id_satker;
        const nilai = parseFloat(paket.nilai_pagu) || 0;
        rupSwakelolaMap.set(id, (rupSwakelolaMap.get(id) || 0) + nilai);
    }
});

// 5. GENERATE REKAP FINAL
const rekapList = [];
let totalPagu = 0, totalRup = 0;

for (const [satkerId, satkerInfo] of satkerMap) {
    const pagu = paguMap.get(satkerId) || 0;
    const rupPenyedia = rupPenyediaMap.get(satkerId) || 0;
    const rupSwakelola = rupSwakelolaMap.get(satkerId) || 0;
    const totalRupSatker = rupPenyedia + rupSwakelola;
    
    // Skip jika pagu = 0
    if (pagu === 0) continue;
    
    const persentase = Math.round((totalRupSatker / pagu) * 100 * 10) / 10;
    
    const rekap = {
        id: satkerId,
        'Satuan Kerja': satkerInfo['Satuan Kerja'],
        'Kode Satker': satkerInfo['Kode Satker'],
        'Pagu Program': pagu,
        'RUP Penyedia': rupPenyedia,
        'RUP Swakelola': rupSwakelola,
        'Total RUP Terumumkan': totalRupSatker,
        'Persentase': persentase
    };
    
    rekapList.push(rekap);
    
    totalPagu += pagu;
    totalRup += totalRupSatker;
}

console.log(`\n📈 SUMMARY:`);
console.log(`   Satker dengan pagu: ${rekapList.length}`);
console.log(`   Total Pagu: Rp ${totalPagu.toLocaleString()}`);
console.log(`   Total RUP: Rp ${totalRup.toLocaleString()}`);
console.log(`   Realisasi rata-rata: ${Math.round((totalRup/totalPagu)*100)}%`);

// Sort by persentase DESC
rekapList.sort((a, b) => b['Persentase'] - a['Persentase']);

// Save rekap.json
const outputPath = path.join(DATA_PATH, 'rekap.json');
fs.writeFileSync(outputPath, JSON.stringify(rekapList, null, 2), 'utf8');
console.log(`\n💾 Saved: ${outputPath} (${rekapList.length} records)`);

// Save metadata
const meta = {
    generated_at: new Date().toISOString(),
    total_satker: rekapList.length,
    total_pagu: totalPagu,
    total_rup: totalRup,
    rata_rata_persentase: Math.round((totalRup/totalPagu)*100),
    source_files: Object.keys(rawData),
    raw_records: totalRecords
};
fs.writeFileSync(path.join(DATA_PATH, 'metadata.json'), JSON.stringify(meta, null, 2));
console.log(`📋 Saved: data/metadata.json`);

// Save timestamp
fs.writeFileSync(path.join(DATA_PATH, 'last-update.txt'), 
    `Last updated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\nTotal satker: ${rekapList.length}\nRealisasi rata-rata: ${Math.round((totalRup/totalPagu)*100)}%`);
console.log(`⏰ Saved: data/last-update.txt`);

console.log('\n🎉 === PROCESSING COMPLETE ===');
console.log('🌐 Website akan otomatis update!');
console.log(`📱 Live: https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY || 'YOUR-REPO'}/main/data/rekap.json`);
