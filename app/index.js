'use strict';

const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');
const Mongoose = require('mongoose');
const tesseract = require("node-tesseract-ocr")
const dotenv = require('dotenv');
dotenv.config();

const init = async () => {

    const server = Hapi.server({
        port: 8001,
        host: '0.0.0.0'
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
        handler: (request, h) => {
           
            const image = request.payload.image;
            const config = {
                lang: 'deu',
                oem: 1,
                psm: 11,
                tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzöäü'
            }
            
            if(!image) {
                return h.response();
            }
            
            const base64string = image.split(',')[1];
            
            return tesseract
                .recognize(Buffer.from(base64string, 'base64'), config)
                .then(async (text) => {
                    console.log("Result:", text)
                    
                    const rankedProducts = await Product.find({$text: {$search: text}}, {score: {$meta: 'textScore'}}).sort({score: {$meta: 'textScore'}})
                    console.log(rankedProducts);
                    // const product = new Product({ name: 'Olive Oil', text });
                    // product.save();
                    
                    return { text: Hoek.reach(rankedProducts, [0, 'name']) || 'No Matching Products' };
                })
                .catch((e) => {
                    
                    console.log(e);
                    return e;
                });
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
