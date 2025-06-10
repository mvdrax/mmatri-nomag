const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
app.use(cors());


app.get('/api/excel-data', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'data', 'agencesNames.xlsx'); 
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la lecture du fichier Excel.' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(` Serveur lancé sur http://localhost:${PORT}`);
});
