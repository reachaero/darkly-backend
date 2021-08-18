'use strict';

const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');
const Mongoose = require('mongoose');
const dotenv = require('dotenv');
const { TextractClient, DetectDocumentTextCommand }= require('@aws-sdk/client-textract');
dotenv.config();

const init = async () => {

    const server = Hapi.server({
        port: 8001,
        host: '0.0.0.0'
    });

    const client = new TextractClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        options: { 
            cors: {
                origin: ['*']
            }
        },
        handler: (request, h) => {
           
            return 'hellllllooo!';
        }
    });

    server.route({
        method: 'POST',
        path: '/doOCR',
        options: { 
            cors: {
                origin: ['*']
            }
        },
        handler: async (request, h) => {
           
            const image = request.payload.image;
            
            if(!image) {
                return h.response();
            }
            
            const base64string = image.split(',')[1];
            const command = new DetectDocumentTextCommand({
                Document: {
                    Bytes: Buffer.from(base64string, 'base64')
                }
            });
            
            try {
                const response = await client.send(command);
                const text = response.Blocks.map((b) => b.Text).join(' ');
                const rankedProducts = await Product
                    .find({$text: {$search: text}}, {score: {$meta: 'textScore'}})
                    .sort({score: {$meta: 'textScore'}})
                    .lean();

                return Hoek.merge(rankedProducts[0] || { name_de: "No matching products" }, { ocr: text });

            } catch (err) {

                console.log(err);
            }
        }
    });

    Mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    const Product = Mongoose.model('product', new Mongoose.Schema({ 
        name: String,
        text: {
            type: String,
            index: true
        }
    }));

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
