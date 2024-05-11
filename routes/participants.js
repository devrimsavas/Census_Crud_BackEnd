var express = require('express');
var router = express.Router();
var isThisAdmin = require('../isThisAdmin');
var session = require('express-session');
var fs=require('fs');
var path=require('path');

// Initialize an in-memory store for participants

/*
let participants = [
    {
        "email": "example@example.com",
        "personalInfo": {
            "firstname": "John Updates",
            "lastname": "Doe",
            "dob": "1990/06/15"
        },
        "work": {
            "companyname": "New Acme Inc",
            "salary": 55000,
            "currency": "USD"
        },
        "home": {
            "country": "USA",
            "city": "Chicago"
        }
    }
];

*/
//load participants
const participantsFilePath = path.join(__dirname, '../data/participants.json');

function loadParticipants() {
    return new Promise((resolve, reject) => {
        fs.readFile(participantsFilePath, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
}

//save participants
function saveParticipants(participants) {
    return new Promise((resolve, reject) => {
        fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2), (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}




router.use(isThisAdmin);

//index page of participants

router.get('/index',function(req,res) {

    res.render('participants', {
        title: 'Census Application',
        username: req.session.username
    })
})

// POST request for adding a participant
// POST request for adding a participant
router.post('/', async (req, res) => {
    const newParticipant = req.body;
    try {
        const participants = await loadParticipants();
        const validationError = validateParticipant(newParticipant);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const existingParticipant = participants.find(p => p.email === newParticipant.email);
        if (existingParticipant) {
            return res.status(409).json({ error: 'Duplicate entry', message: 'A participant with the same email already exists.' });
        }

        participants.push(newParticipant);
        await saveParticipants(participants);
        res.status(201).json({ message: 'Participant added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save participant' });
    }
});



// GET request to fetch all participants
router.get('/', async (req, res) => {
    try {
        const participants = await loadParticipants();
        res.json({
            status: "success",
            count: participants.length,
            data: participants
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load participants' });
    }
});


// GET request for fetching personal details of all participants
router.get('/details', async (req, res) => {
    try {
        const participants = await loadParticipants();
        const details = participants.map(participant => ({
            firstname: participant.personalInfo.firstname,
            lastname: participant.personalInfo.lastname,
            dob: participant.personalInfo.dob
        }));
        res.json(details);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load participant details' });
    }
});


// GET request for fetching details of a participant by email
router.get('/details/:email', async (req, res) => {
    try {
        const participants = await loadParticipants();
        const participant = participants.find(p => p.email === req.params.email);
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        const details = {
            firstname: participant.personalInfo.firstname,
            lastname: participant.personalInfo.lastname,
            dob: participant.personalInfo.dob,
            work: participant.work,
            home: participant.home,
            email: participant.email,
            salary: participant.work.salary,
            currency: participant.work.currency
        };
        res.json({ status: "success", data: details });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch details' });
    }
});


// DELETE request to remove a participant by email
router.delete('/:email', async (req, res) => {
    try {
        let participants = await loadParticipants();
        const index = participants.findIndex(p => p.email === req.params.email);
        if (index === -1) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        participants.splice(index, 1);
        await saveParticipants(participants);
        res.status(200).json({ message: 'Participant deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete participant' });
    }
});

// PUT request to update a participant by email
router.put('/:email', async (req, res) => {
    try {
        let participants = await loadParticipants();
        const index = participants.findIndex(p => p.email === req.params.email);
        if (index === -1) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        participants[index] = req.body; // Update the participant with new data
        await saveParticipants(participants);
        res.status(200).json({ message: 'Participant updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update participant' });
    }
});


// GET request for fetching work details of a participant by email

router.get('/work/:email', async (req, res) => {
    try {
        const participants = await loadParticipants();
        const participant = participants.find(p => p.email === req.params.email);
        if (!participant || !participant.work) {
            return res.status(404).json({ error: 'Work details not found' });
        }
        res.json(participant.work);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch work details' });
    }
});

router.get('/home/:email', async (req, res) => {
    try {
        const participants = await loadParticipants();
        const participant = participants.find(p => p.email === req.params.email);
        if (!participant || !participant.home) {
            return res.status(404).json({ error: 'Home details not found' });
        }
        res.json(participant.home);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch home details' });
    }
});



module.exports = router;



//seperate function to validate participants data so we can keep routes clean 

function validateParticipant(data) {
    const { email, personalInfo, work, home } = data;
    
    // Validate top-level and nested properties
    if (!email || !personalInfo || !work || !home) {
      return 'All main sections (email, personalInfo, work, home) must be provided';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Invalid email format';
    }
    if (!personalInfo.firstname || !personalInfo.lastname || !personalInfo.dob) {
      return 'Missing fields in personalInfo';
    }
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(personalInfo.dob)) {
      return 'DOB must be in YYYY/MM/DD format';
    }
    if (!work.companyname || work.salary === undefined || !work.currency) {
      return 'Missing fields in work';
    }
    if (typeof work.salary !== 'number') {
      return 'Salary must be a number';
    }
    if (!home.country || !home.city) {
      return 'Missing fields in home';
    }  
    
    return null; // No errors found
  }