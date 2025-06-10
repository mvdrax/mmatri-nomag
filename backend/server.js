const express = require('express'); //framework
const cors = require('cors'); // rqts cross originin
const multer = require('multer');
const bodyParser = require('body-parser'); // analyse corps des rqt
const sql = require('mssql'); //module d'interaction installé
const upload = multer();
const app = express();
const PORT = 3000; // port pour écouter les rqt
const { v4: uuidv4 } = require('uuid');

app.use(cors()); //activation du cors
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); //lecture des données


const dbConfig = { //paramétrage de la connexion à la bdd
  server: 'SRV-RDS',
  database: 'FacturesClient',
  options: {
    encrypt: true, 
    trustServerCertificate: true, 
  },

  authentication: { 
    type: 'default',
    options: {
        userName: 'bironm', 
        password: 'Motdepasse99', 
    },
},
};

sql.connect(dbConfig) //connexion
  .then(() => console.log('Connecté à SQL Server'))
  .catch((err) => {
    console.error('Erreur de connexion à SQL Server:', err);
    process.exit(1);
  });


  app.get('/api/files', async (req, res) => {
    console.log('Route /api/files appelée');
    try {
      const pool = await sql.connect(dbConfig); 
      const result = await pool.request()
        .query("SELECT Id, DocFile, fileType, agenceCode, dateFile, tiersName FROM Documents"); 
  
      if (result.recordset.length === 0) {
        return res.status(404).send({ error: 'Aucun fichier trouvé' });
      }


      const files = result.recordset.map(file => ({
      id: file.Id,
      docFile: file.DocFile? file.DocFile.toString('base64') : '',  
      fileType: file.fileType,
      agenceCode: file.agenceCode,
      dateFile: file.dateFile,
      tiersName: file.tiersName
    }));



      res.status(200).send(files);  
    } catch (err) {
      console.error('Erreur lors de la récupération des fichiers:', err);
      res.status(500).send({ error: 'Erreur interne du serveur' });
    }
  });






// get pour récupérer la liste des agences pour le menu déroulant 


app.get('/api/files/agences' , async (req, res) => {

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
    .query("SELECT DISTINCT agenceCode FROM Documents WHERE agenceCode IS NOT NULL");
  
    const agencesList = result.recordset.map(agence => agence.agenceCode);
    res.send(agencesList);
  
  } catch (err) {
    console.error(err);
    res.status(500).send({ error : 'Erreur de récupération'});
    res.status(404).send({ error: 'Problème user'});
  }
  
  
  
  }
  
  );
  
  app.get('/api/files/periods' , async (req, res) => {
  
    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool.request()
      .query("SELECT DISTINCT dateFile FROM Documents WHERE dateFile IS NOT NULL");
    
      const periodsList = result.recordset.map(period => 
        {const date = new Date(period.dateFile);
          const month = (date.getMonth()+1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${year}`;

          


        }
        );
        
        const finalPeriodsList = [...new Set(periodsList)];
      res.send(finalPeriodsList);
    
    } catch (err) {
      console.error(err);
      res.status(500).send({ error : 'Erreur de récupération'});
      res.status(404).send({ error: 'Problème user'});
    }
    
    
    
    }
    
    );   




  //get par agence pour récupérer les fichiers 


 
 app.get('/api/files/:agenceCode', async (req, res) => {
  const agenceCode = req.params.agenceCode;
  console.log(`Route /api/files/${agenceCode} appelée`);
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('agenceCode', sql.VarChar, agenceCode)
      .query("SELECT Id, DocFile, fileType, dateFile, tiersName FROM Documents WHERE agenceCode = @agenceCode");

   const agencyResults = result.recordset.map(file => ({
    id: file.Id,
    docFile: file.DocFile? file.DocFile.toString('base64') : '',  
    fileType: file.fileType,
    agenceCode: file.agenceCode,
    dateFile: file.dateFile,
    tiersName: file.tiersName
  }));
  res.status(200).send(agencyResults); }
  catch (err) {
    console.error(err);
    res.status(500).send({ error : 'Erreur de récupération'});
    res.status(404).send({ error: 'Problème user'});
  }
  
});



  
  

// endpoint pour récupérer les fichiers selon la période

app.get('/api/files/:dateFile/:agenceCode', async (req, res) => {

  const {dateFile,agenceCode} = req.params;
  try {
       const pool = await sql.connect(dbConfig);
       const result = await pool.request()
       .input('dateFile',  sql.date, dateFile)
       .input ('agenceCode', sql.VarChar, agenceCode)
       .query( "SELECT Id, DocFile, fileType, tiersName FROM Documents WHERE YEAR(dateFile) = @dateFile AND MONTH(dateFile) = @dateFile AND agenceCode = @agenceCode"
        );
        const periodResults = result.recordset.map(file => ({
          id: file.Id,
          docFile : file.docFile? file.DocFile.toString('base64') : '',
          fileType: file.fileType,
          agenceCode: file.agenceCode,
          dateFile: file.dateFile,
          tiersName: file.tiersName
        }));
        res.status(200).send(periodResults); }
        catch (err) {
          console.error(err);
          res.status(500).send({error : "500 Erreur de récupération"});
          res.status(400).send({error : "400 Erreur de User"});
        }
});


// endpoint pour récupérer les fichiers selon la période ET l'agence

app.get('/api/files/:agence/:year/:month', async (req, res) => {

  const { agence, year, month } = req.params;
  try {
       const pool = await sql.connect(dbConfig);
       const result = await pool.request()
       .input('agence', sql.VarChar, agence)
       .input('year', sql.Int, parseInt(year))
       .input('month', sql.Int, parseInt(month))
       .query( "SELECT Id, DocFile, fileType, agenceCode, tiersName FROM Documents WHERE YEAR(dateFile) = @year AND MONTH(dateFile) = @month AND agenceCode = @agence "
        );
        const periodResults = result.recordset.map(file => ({
          id: file.Id,
          //docFile : file.docFile? Buffer.from(file.DocFile).toString('base64') : '',
          docFile : Buffer.from(file.DocFile).toString('base64') ,

          fileType: file.fileType,
          agenceCode: file.agenceCode,
          dateFile: file.dateFile,
          tiersName: file.tiersName
        }));
      res.status(200).send(periodResults); 
      //res.status(200).json(result.recordset); 
      
      }
        catch (err) {
          console.error(err);
          res.status(500).send({error : "500 Erreur de récupération"});
          res.status(400).send({error : "400 Erreur de User"});
        }
});
















// Endpoint pour uploader un fichier
app.post('/api/files/upload',  upload.single('file') , async (req, res) => {
  try {
    const { fileType, agenceCode, dateFile, tiersName } = req.body;
    const fileBuffer = req.file.buffer;
   console.log('buffer')
  console.log('buffer:', fileBuffer);
  window.alert(fileBuffer)

    if ( !fileType || !agenceCode || !dateFile || !tiersName) {
      return res.status(400).send({ error: 'Invalid request' });
    }

    const id = uuidv4();
    

    // Connexion SQL
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('fileType', sql.NVarChar(10), fileType)
      .input('agenceCode', sql.VarChar(8), agenceCode)
      .input('dateFile', sql.Date, dateFile)
      .input('tiersName', sql.VarChar(30), tiersName)
      .input('docFile', sql.VarBinary(sql.MAX), fileBuffer)
      .query(`
        INSERT INTO test1 (id, docFile, fileType, agenceCode, dateFile, tiersName)
        VALUES (@id, @docFile, @fileType, @agenceCode, @dateFile, @tiersName);
      `);

    res.status(200).send({ message: 'Fichier téléchargé avec succès' });
  } catch (err) {
    console.error('Erreur lors de l\'insertion dans SQL Server:', err);
    res.status(500).send({ error: 'Erreur interne du serveur' });
  }
});



app.listen(PORT, () => {  //démarrer le serveur sur le port
   console.log(`Backend running at http://localhost:${PORT}`);
});


