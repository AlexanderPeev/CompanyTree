import {Rest} from "./rest/rest";
import {StorageEngine} from "./storage/storage.engine";

export class Main {
    public main(): void {
        const port = parseInt(process.env.PORT || '8000', 10);
        const dbEndpoint = process.argv[2] || 'postgres://dbuser:mysecretpassword@db:5432/mydb';
        console.log('Setting up REST interfaces with DB endpoint: ' + dbEndpoint);

        this.startRestService(dbEndpoint, port);
    }

    private startRestService(dbEndpoint: string, port: number): void {
        console.log('Starting REST Service: ' + port);
        new StorageEngine(dbEndpoint).prepare().then(storage => new Rest().setup(storage, port)).catch(e => {
            console.error(e);
        });
    }
}


new Main().main();
