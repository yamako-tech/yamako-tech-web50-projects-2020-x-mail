document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document.querySelector("#inbox").addEventListener("click", () => load_mailbox("inbox"));
  document.querySelector("#sent").addEventListener("click", () => load_mailbox("sent"));
  document.querySelector("#archived").addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // Add event to the form
  document.querySelector("#compose-form").addEventListener("submit", send_email);

  // By default, load the inbox
  load_mailbox("inbox");
});

function send_email(event) {
  // Get the required fields.
  const recipients = document.querySelector("#compose-recipients").value;
  const subject = document.querySelector("#compose-subject").value;
  const body = document.querySelector("#compose-body").value;

  // Send the data to the server.
  fetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body,
    }),
  })
    // Receive email and parse it in JSON format.
    .then((response) => response.json())
    .then((result) => {
      load_mailbox("sent", result);
    })
    .catch((error) => console.log(error));
}

function compose_email() {
  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";

  // Show the mailbox name
  document.querySelector("#emails-view").innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
    }</h3>`;

  // Get each mailbox from the server.
  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      emails.forEach((item) => {
        
        const email_unit = document.createElement("div");
        build_emails(item, email_unit, mailbox);

        email_unit.addEventListener("click", () => read_email(item["id"]));
        document.querySelector("#emails-view").append(email_unit);

      });
    })
    .catch((error) => console.error(error));
}



function build_emails(item, email_unit, mailbox) {
  // First, check where you are
  if (mailbox === "inbox" && item["archived"]) {
    return;
  }
  else if (mailbox === "archive" && !item["archived"]) {
    return;
  }

  // Set and style the email list view
  const content = document.createElement("div");
  const recipients = document.createElement("strong");
  if (mailbox === "sent") {
    recipients.innerHTML = item["recipients"].join(", ") + " ";
  }
  else {
    recipients.innerHTML = item["sender"] + " ";
  }
  content.append(recipients);
  content.innerHTML += item["subject"];

  // Set and style the date.
  const date = document.createElement("div");
  date.innerHTML = item["timestamp"];
  date.style.display = "inline-block";
  date.style.float = "right";

  // Change color of the unit by read or unread
  if (item["read"]) {
    email_unit.style.backgroundColor = "lightgrey";
    date.style.color = "black";
  } else {
    date.className = "text-muted";
  }
  content.append(date);

  
  // Fill the unit with styled content
  content.style.padding = "10px";
  email_unit.append(content);


  // Style the unit.
  email_unit.style.borderStyle = "solid";
  email_unit.style.margin = "10px";
}


// Single email view
function read_email(id) {
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#email-view").style.display = "block";

  // Clear out the previous data
  document.querySelector("#email-view").innerHTML = "";

  // Get the data and build the unit.
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(result => {
      build_email(result);
    })
    .catch(error => console.log(error));

  // Set the email for single email view (read)
  fetch(`/emails/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: true
    })
  });
}

// Build data and style for each email-unit
// <strong> font for from, to, subject, and timestamp
function build_email(data) {
  // Put "sendder" to "From" section
  const from = document.createElement("div");
  from.innerHTML = `<strong>From: </strong> ${data["sender"]}`;
  document.querySelector("#email-view").append(from);

  // Put "recipients" to "to" section
  const to = document.createElement("div");
  to.innerHTML = `<strong>To: </strong> ${data["recipients"].join(", ")}`;
  document.querySelector("#email-view").append(to);

  const subject = document.createElement("div");
  subject.innerHTML = `<strong>Subject: </strong> ${data["subject"]}`;
  document.querySelector("#email-view").append(subject);

  const timestamp = document.createElement("div");
  timestamp.innerHTML = `<strong>Timestamp: </strong> ${data["timestamp"]}`;
  document.querySelector("#email-view").append(timestamp);

  // "Reply_button" before body
  const reply_button = document.createElement("button");
  document.querySelector("#email-view").append(reply_button);

  // "Archive_button" before body
  const archive_button = document.createElement("button");
  document.querySelector("#email-view").append(archive_button);

  // Add "line" before "body"
  document.querySelector("#email-view").append(document.createElement("hr"));

  // body has "innerText" instead of "innerHTML" for new lines
  const body = document.createElement("div");
  body.innerText = data["body"];
  document.querySelector("#email-view").append(body);

  // Archive button
  archive_button.innerHTML = '';
  if (data["archived"]) {
    archive_button.innerHTML += "Unarchive";
  } else {
    archive_button.innerHTML += "Archive";
  }
  archive_button.classList = "btn btn-outline-primary m-2";
  archive_button.addEventListener("click", () => {
    archive_email(data);
    load_mailbox("inbox");
  });

  // Reply button
  reply_button.innerHTML = 'Reply';
  reply_button.classList = "btn btn-outline-primary m-2";

  // Addd event to reply_button and append data
  reply_button.addEventListener("click", () => compose_reply(data));

}


// Reuse compose_email for reply
function compose_reply(data) {
  compose_email();
  document.querySelector('#compose-recipients').value = data["sender"];
  document.querySelector('#compose-subject').value =data["subject"].slice(0,4)==="Re: " ? data["subject"] : "Re: " + data["subject"] ;
  const previous_body = `\n \n \n On ${data['timestamp']} ${data["sender"]} wrote: \n`;
  document.querySelector('#compose-body').value = previous_body + data["body"].replace(/^/gm, "\t");
}

// Put email archived
function archive_email(data) {
  fetch(`/emails/${data["id"]}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: !data["archived"]
    })
  });
}