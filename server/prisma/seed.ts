import { PrismaClient, Product } from "@prisma/client";
import {faker} from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
    await prisma.product.deleteMany({});

    const noOfproducts = 100;

    
    const products: Product[] = [];

    for(let i=0; i<noOfproducts; i++){
        products.push({
            ProductCode: faker.string.uuid(),
            BarCode: faker.string.sample(),
            ProductName: faker.commerce.productName(),
            ProductDescription: faker.commerce.productDescription(),
            ProductCategory: faker.commerce.department(),
            CostPrice: parseFloat(faker.commerce.price()),
            SellPrice: parseFloat(faker.commerce.price()),
            MaxretailPrice: parseFloat(faker.commerce.price()),
            ReorderQuantity: faker.number.int(),
            PackedWeight: faker.number.int(),
            PackedHeight: faker.number.int(),
            PackedWidth: faker.number.int(),
            PackedDepth: faker.number.int(),
            Refrigerated: faker.datatype.boolean(),
            ProductID: faker.string.hexadecimal({length: 24, casing:"lower", prefix: ''}),
        });
    }


    const addProducts = await prisma.product.createMany({ data: products });

    console.log("Products added successfully");


}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });