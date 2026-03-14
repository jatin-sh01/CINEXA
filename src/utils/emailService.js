import axios from "axios";

const sendMail = async (subject, email, content) => {
  await axios.post(process.env.NOTI_SERVICE + "/api/tickets", {
    subject: subject,
    recepientEmails: [email],
    content: content,
  });
};

export default sendMail;
