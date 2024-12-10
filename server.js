// index.js (or server file)
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const pdf = require('pdfkit');
const fs = require('fs');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');


const User = require('./user.model'); 

const app = express();

app.use(express.static('./'));
app.use(express.static('./'));
app.use(express.json());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
  })
);


var logged_in_User;



mongoose.connect('mongodb://localhost:27017/mydb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
    // Save data to MongoDB when connected
    saveDataToMongoDB();
  })
  .catch(err => console.error('Connection error:', err));

app.use(express.json()); // Middleware to parse incoming request bodies as JSON


const productSchema = new mongoose.Schema({
  name: String,
  productId: String,
  category: String,
  company: String,
  model: String,
  description: String,
  price: Number,
  priceWithTax: Number,
  image: String
});


function readAndParseExcel() {
  const workbook = xlsx.readFile('./Database.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { raw: true });

  // Map Excel data to match the product schema fields
  const mappedData = data.map(item => ({
    name: item['Product Name'],
    // image_path: item['Image'],
    productId: item['Product ID'],
    category: item['Category'],
    company: item['Company'],
    model: item['Model'],
    description: item['Description'],
    price: parseFloat(item['Price']),
    priceWithTax: parseFloat(item['Price (+ tax.)']),
    image: item['Image Path']
  }));

  console.log('Data read from Excel file:');
  console.log(mappedData);

  return mappedData;
}


const Product = mongoose.model('Product', productSchema);
async function saveDataToMongoDB() {
  try {
    // Read the data from the xls file
    const productsData = readAndParseExcel();
    console.log(productsData);

    // Check for each product if it exists on the database
    for (const productData of productsData) {
      // Using the findOne function we search for a product based on its ID
      const existingProduct = await Product.findOne({ productId: productData.productId });

      // If not found then create a new element on the database
      if (!existingProduct) {
        await Product.create(productData);
      } else {
        // Else print this error message
        console.log(`Product with productId ${productData.productId} already exists. Skipping...`);
      }
    }
  } catch (error) {
    console.error('Error inserting data into MongoDB:', error);
  }
}


app.get('/get-products', async (req, res) => {
  try {
    const searchString = req.query.searchString; // Get the search string from query params
    // Query MongoDB to find products that match the search string
    const products = await Product.find({ productId: { $regex: `^${searchString}`, $options: 'i' } });
    res.json(products);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/products-verify-only', async (req, res) => {
  try {
    const products = await Product.find();
    
    // Map products to a more readable format
    const formattedProducts = products.map(product => ({
      name: product.name,
      image: product.image_path,
      productId: product.productId,
      category: product.category,
      company: product.company,
      model: product.model,
      description: product.description,
      price: product.price,
      priceWithTax: product.priceWithTax
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Παραγγελίες 
app.get('/user-orders', async (req, res) => {
  try {
    // Check if the user is logged in
    if (!req.session.loggedIn) {
      return res.status(401).json({ error: 'User not logged in' });
    }
    
    // Find the user in the database
    const user = await User.findOne({ email: logged_in_User.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the user's orders
    res.json(user.orders);
  } catch (error) {
    console.error('Error retrieving user orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Define a route to get product description by ID
app.get('/get-description', async (req, res) => {
  try {
      const productId = req.query.productId;
      // Assuming you have a Product model
      const product = await Product.findOne({ productId });
      if (!product) {
          return res.status(404).json({ error: 'Product not found' });
      }
      res.json({
          name: product.name,
          company: product.company,
          id: product.productId,
          description: product.description,
          price: product.price,
          price_with_tax: product.priceWithTax,
          model: product.model,
          image: product.image_path // Assuming you have an image field in your product model
      });
  } catch (error) {
      console.error('Error retrieving product description:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Εγγραφή
app.post('/register', async (req, res) => {
  try {
    const { email, username, password, psw_repeat } = req.body;
    console.log(req.body);


    const users = await User.find({ email }); 

    if (users.length > 0) {
      res.status(501).send('User email exists');
      return; // Stop the execution here if the email exists
    }

    
    
    const newUser = new User({ username: username, password: password, email:email });
    await newUser.save();
    req.session.loggedIn = true;
    logged_in_User = new User({username, password: password, email });

    res.status(200).send('User registered successfully');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
  }
});


// Σύνδεση
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        
        // Login logic 
        var users = await User.find();

        const formattedUsers = users.map(user => {
          return {
            _id: user._id,
            username: user.username, 
            password: user.password, 
            email: user.email
          };
        });
        
        var flag_found = 0
        for (i = 0; i < formattedUsers.length; i++){
          if (username === formattedUsers[i].username){
            flag_found = 1
            if (password === formattedUsers[i].password){
              console.log('successfull login')
              var uname = formattedUsers[i].username
              var email = formattedUsers[i].email
              logged_in_User = new User({ username: uname, email });
              break;
            }
            else{
              res.status(401).send('Wrong password');
              return; // Stop the execution here if the password is wrong
            }
          }
        }
        if (flag_found === 0){
          res.status(404).send('User does not exist');
          return; 
        }else{
           // Sending a response back to the client
          req.session.loggedIn = true;          
          
          res.status(200).send('User logged in successfully');

        }
        
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in');
    }
});


// Έλεγχος συνδεδεμένου χρήστη
app.get('/checkLoginStatus', (req, res) => {
  res.json({ loggedIn: req.session.loggedIn || false });
});


// Αποσύνδεση
app.post('/logout', (req, res) => {
  try {
      req.session.loggedIn = false;
      res.status(200).send('Logged out successfully');
  } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).send('Error logging out');
  }
});


// Πληροφορίες χρήστη
app.get('/userInfo', (req, res) => {
  if (req.session.loggedIn) {
    const userInfo = {
      email: logged_in_User.email, // Fetch the email from your database
      username: logged_in_User.username // Fetch the username from your database
    };
    
    res.json(userInfo);
  } else {
    res.status(401).send('User not logged in');
  }
});

// Διαδικασία πληρωμής
app.post('/processPayment', async (req, res) => {
  const pdfDoc = new pdf();
  const writeStream = fs.createWriteStream('payment_receipt.pdf');

  pdfDoc.pipe(writeStream);

  // Write user information
  pdfDoc.fontSize(12).text(`Name: ${req.body.first_name} ${req.body.last_name}`, 50, 50);
  pdfDoc.text(`Email: ${req.body.email}`, 50, 70);
  pdfDoc.text(`Card Number: ${req.body.card_number}`,50,90)
  // pdfDoc.text(`Birth Date: ${req.body.bday}-${req.body.bmonth}-${req.body.byear}`, 50, 110);


  const currentDate = new Date();
  const dateString = currentDate.toDateString(); // "Sat Nov 20 2023"
  pdfDoc.text(`Current Date: ${dateString}`, 50, 110);
  pdfDoc.text(`Total: ${req.body.total_price}`, 50, 130);
  // Write items and images
  const items = req.body.items;
  // console.log(logged_in_User)
  // console.log(req.session.loggedIn)
  if (req.session.loggedIn){
    try{
      const user = await User.findOne({ email: logged_in_User.email });
      if (!user) {
        console.log(logged_in_User)
      //   return res.status(404).send('User not found');
      }
      
      const order_id = new Date().toISOString();

      // Create an order object
      const order = {
        order_id: order_id,
        orders: items
      };
      // Push the newly created order object to the user's orders array
      user.orders.push(order);

      // Save the updated user document
      await user.save();
  }
  catch{
    console.log('Order save failed');
  }

}  let yOffset = 170; // Initial Y offset for item details

  items.forEach((item, index) => {
    pdfDoc.text(`Item ${index + 1}: ${item.product_name} - Price: ${item.price}`, 50, yOffset);
    pdfDoc.image(item.image_path, 50, yOffset + 20, { width: 100 }); 

    yOffset += 150; 
  });



  pdfDoc.end();
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Gmail, Outlook, etc.
    auth: {
      user: 'ecomptyx@gmail.com',
      pass: 'wmzg bziw exrf tsqn'
    }
  });

  const mailOptions = {
    from: 'ecomptyx@gmail.com',
    to: req.body.email,
    subject: 'Payment Receipt',
    text: 'Ευχαριστούμε για την παραγγελία σας! Θα βρείτε την απόδειξη παρακάτω.',
    attachments: [
      {
        filename: 'payment_receipt.pdf',
        path: './payment_receipt.pdf'
      }
    ]
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Payment received, PDF generated, and email sent.');
    }
  });


});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});