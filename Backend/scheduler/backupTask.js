const cron = require('node-cron');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 7;

// Services configuration
const services = [
    { name: 'auth-service', envPath: path.join(__dirname, '..', 'auth-service', '.env') },
    { name: 'invoice-service', envPath: path.join(__dirname, '..', 'invoice-service', '.env') },
    { name: 'file-service', envPath: path.join(__dirname, '..', 'file-service', '.env') }
];

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (err) {
        console.error('Failed to create backup directory:', err);
    }
}

const performBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const todayBackupDir = path.join(BACKUP_DIR, timestamp);
    
    if (!fs.existsSync(todayBackupDir)) {
        try {
            fs.mkdirSync(todayBackupDir, { recursive: true });
        } catch (err) {
            console.error('Failed to create daily backup directory:', err);
            return;
        }
    }

    console.log(`[${new Date().toISOString()}] Starting daily backup...`);

    for (const service of services) {
        try {
            if (!fs.existsSync(service.envPath)) {
                console.warn(`Skipping ${service.name}: .env file not found at ${service.envPath}`);
                continue;
            }

            // Parse .env file manually to avoid polluting process.env
            const envConfig = dotenv.parse(fs.readFileSync(service.envPath));
            const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = envConfig;

            if (!DB_NAME) {
                console.warn(`Skipping ${service.name}: DB_NAME not found in .env`);
                continue;
            }

            const fileName = `${service.name}_${DB_NAME}.sql`;
            const filePath = path.join(todayBackupDir, fileName);

            // Construct pg_dump command
            // Using Plain SQL format for readability unless binary is preferred. 
            // Let's use Plain SQL (-F p) so it's human readable, or Custom (-F c) for restore reliability.
            // I'll use -F p (plain) as it's often expected for simple "backups". 
            // Actually, let's use -F c (custom) because it compresses and handles blobs better.
            // But wait, if they want to just open it, SQL is better.
            // Given "automatic backup", usually implies restoration capability.
            // I will use -F p (plain text SQL) as it is most versatile for small-medium DBs.
            const command = `pg_dump -h ${DB_HOST || 'localhost'} -p ${DB_PORT || 5432} -U ${DB_USER} -d ${DB_NAME} -F p -f "${filePath}"`;

            console.log(`Backing up ${service.name} (DB: ${DB_NAME})...`);
            
            // Execute command synchronously
            // Pass PGPASSWORD in env to avoid password prompt
            const result = shell.exec(command, { 
                env: { ...process.env, PGPASSWORD: DB_PASSWORD },
                silent: true 
            });

            if (result.code !== 0) {
                console.error(`Error backing up ${service.name}: ${result.stderr}`);
            } else {
                console.log(`Successfully backed up ${service.name} to ${fileName}`);
            }

        } catch (error) {
            console.error(`Unexpected error for ${service.name}:`, error);
        }
    }

    // Cleanup old backups
    cleanOldBackups();
};

const cleanOldBackups = () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = new Date().getTime();
        const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            // We expect directories or files. If directories (timestamped), check their creation time.
            const stats = fs.statSync(filePath);
            
            // If it's a directory (which we create per backup run)
            if (stats.isDirectory()) {
                // Check if older than retention period
                if (now - stats.birthtime.getTime() > retentionMs) {
                    console.log(`Removing old backup directory: ${file}`);
                    shell.rm('-rf', filePath);
                }
            }
        });
    } catch (error) {
        console.error('Error cleaning old backups:', error);
    }
};

const initScheduler = () => {
    console.log('Initializing Daily Backup Scheduler (Runs at 00:00 daily)');
    
    // Schedule task to run at 00:00 every day
    cron.schedule('0 0 * * *', () => {
        performBackup();
    });
};

module.exports = { initScheduler, performBackup };
