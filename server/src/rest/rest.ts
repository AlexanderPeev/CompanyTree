import {createServer, plugins, Server} from 'restify';
import {StorageData} from "../storage/storage.data";
import {RootGetHandler} from "./handlers/root.get";
import {CompanyByIdGetHandler} from "./handlers/company.by.id.get";
import {CompanyByIdGetDescendantsHandler} from "./handlers/company.by.id.get.descendants";
import {CompaniesCreatePostHandler} from "./handlers/companies.create.post";
import {CompanyByIdPatchHandler} from "./handlers/company.by.id.patch";
import {CompanyByIdDeleteHandler} from "./handlers/company.by.id.delete";

const express = require('express');

export class Rest {
    public setup(storage: StorageData, port: number): void {
        const server: Server = createServer();
        server.pre(plugins.pre.dedupeSlashes());
        server.pre(plugins.pre.sanitizePath());
        server.use(plugins.bodyParser());

        const rootGetRequestHandler = new RootGetHandler(storage).getRequestHandler();
        const createPostRequestHandler = new CompaniesCreatePostHandler(storage).getRequestHandler();
        server.get('/rest/root', rootGetRequestHandler);
        server.post('/rest/nodes', createPostRequestHandler);
        server.get('/rest/nodes/:id', new CompanyByIdGetHandler(storage).getRequestHandler());
        server.get('/rest/nodes/:id/descendants', new CompanyByIdGetDescendantsHandler(storage).getRequestHandler());
        server.patch('/rest/nodes/:id', new CompanyByIdPatchHandler(storage).getRequestHandler());
        server.del('/rest/nodes/:id', new CompanyByIdDeleteHandler(storage).getRequestHandler());

        server.listen(port || 8000, '0.0.0.0', () => {
            console.log('%s listening at %s', server.name, server.url);
        });
    }
}
