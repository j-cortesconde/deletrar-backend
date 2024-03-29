const sgMail = require('@sendgrid/mail');
const pug = require('pug');
const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Joaquín Cortés Conde <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Production Sendgrid
      return sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    //TODO: atm dev & prod SG are the same
    // Development Sendgrid
    return sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().send(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', '¡Bienvenido a Deletrar!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Reseteo de contraseña (válido sólo durante 10 minutos)',
    );
  }
};
