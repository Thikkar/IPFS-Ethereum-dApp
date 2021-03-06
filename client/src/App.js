import React, { Component } from 'react';
//import logo from ‘./logo.svg’;
import './App.css';
import web3 from './web3';
import Web3 from 'web3';
import ipfs from './ipfs';
import storehash from './storehash';
import healthToken from './healthToken';
import MemeToken from './MemeToken';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Table, Button, Form, Row,Col,ListGroup,Tabs,Tab,DropdownButton,Dropdown, NavDropdown} from 'react-bootstrap';
import ViewNews from "./ViewNews";
import {DownCircleTwoTone, UpCircleTwoTone,DownOutlined,UpOutlined}from '@ant-design/icons';
import Receipt from "./Receipt";
import Search from "./search"
import { useState } from 'react';
/* global BigInt */
//force the browser to connect to metamask upon entering the site
window.addEventListener('load', async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      try {
          // Acccounts now exposed
          window.ethereum.enable();
          const accounts = await web3.eth.requestAccounts();
          web3.eth.sendTransaction({/* ... */});
      } catch (error) {}
  }
  // Legacy dapp browsers...
  else if (window.web3) {
      window.web3 = new Web3(web3.currentProvider);
      // Acccounts always exposed
      web3.eth.sendTransaction({/* ... */});
  }
  // Non-dapp browsers...
  else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
});

class App extends Component {

  constructor() {
    super();
    //get user's metamask account address
    this.getWalletAddress();

    // this.getReputation();

    this.updateNews();

    // approve the spender to spend on contract creator's behalf, calling this only once
    //this.approve();
  }

  //loading the list of hash from the deployed storeHash contract
  updateNews = async() => {
    const newsfeed = await storehash.methods.getUpdate().call()
    .then(
      (result) => {
        return result;
      }
    )

    console.log("Before update news:" + this.state.newsList)
    this.setState({newsList: newsfeed})
    console.log("After update news:" + this.state.newsList)
  }


  state = {
    //text file hash
    ipfsHash:null,
    //image file hash
    imageHash:null,
    //text box value for report
    value:'',
    //text box value for location
    location:'',
    extension: '',
    // where we store address for deployed contract
    contractAddress:'',
    verified:true,
    // two buffer for two seperate files
    textBuffer:'',
    imageBuffer:'',
    //value for post category
    category: '',
    blockNumber:'',
    transactionHash:'',
    gasUsed:'',
    txReceipt: '',
    walletAddress:'' ,
    reputation:0,
    token_balance:0,
    newsList:[],
    username: '',
    bio: '',
    // text box value for new userName
    nameField:'',
    bioField:'',
    // for search bar
    searchField: '',
    //Byte32 for 'NUHT'
    tokenByte: '0x4e55485400000000000000000000000000000000000000000000000000000000',
    required_token:10*1000000000000000000,
    token_address: '0xdBF789d9f3203BFa3e872c245956A6131103789f',
    //for getting tokens
    tokensRequested: 1,
  };

  onSearchBarInput = e => {
    this.setState({
      searchField: e.target.value
    });
  };

 // approve = async () => {
 //   const amount = 1000000000;
 //   healthToken.methods.approve('0xaEd736D1b3d3cB35be456c9dC4D7F7CA63A78408',amount).call({
 //     from: '0x65bA114024121a991865e9130B196cA9E504E262'
 //   }, (error, transactionHash) => {
 //     console.log("spender approved. Transaction hash: "+ transactionHash);
 //   });
 // }
// get users' wallet address
  getWalletAddress = async() => {
    const accounts =  await web3.eth.getAccounts();
    this.setState({walletAddress: accounts[0]});
    console.log('Fetching address '+this.state.walletAddress);

    // Check if wallet address exists
    if (this.state.walletAddress != '') {
      this.updateReputation();
      this.getTokenBalance();
      this.getUsername(accounts[0]);
      this.getBio(accounts[0]);
    }
  }

  //use Blob to store text in the variable file
  //submit users' typed text
  textSubmit(event) {
    event.preventDefault();
    const element = document.createElement("a");
    const file = new Blob([this.state.value], {type: 'text/plain'});
    console.log("state.value: "+this.state.value);
    let reader = new window.FileReader()
    //read file
    reader.readAsArrayBuffer(file)
    reader.onloadend = () => {
      this.convertToBuffer(reader);
      this.imageSubmit(event);
    }
  }

  // Image saved to imageBuffer once we select the file
  // For the text however, they are saved to the textBuffer once we click submit.
  captureFile = (event) => {
        event.stopPropagation()
        event.preventDefault()
        const file = event.target.files[0]
        let fileExt = file.name.split('.').pop()
        console.log("File name extension is:" + fileExt)
        this.setState({ extension: fileExt})
        let reader = new window.FileReader()
        reader.readAsArrayBuffer(file)
        reader.onloadend = () => this.convertImageToBuffer(reader)
  };

  convertImageToBuffer = (reader) => {
      //file is converted to a buffer for upload to IPFS
        const buffer = Buffer.from(reader.result);
      //set this buffer -using es6 syntax
        this.setState({imageBuffer: buffer});
  };

  convertTextToBuffer = (reader) => {
    //file is converted to a buffer for upload to IPFS
      this.setState({textBuffer: Buffer.from(reader.result)});
      console.log(this.state.textBuffer);
      this.actualUpload();
  };

  //first, convert the report text to buffer, then send the combined update to blockchain.
  updateSubmit = async (event) => {
    console.log('Set report category to: ' + this.state.category);
    event.preventDefault();
    //convert the text report to buffer
    const file = new Blob([this.state.value], {type: 'text/plain'});

    console.log("Text input value: " + this.state.value);

    //obtain contract address from storehash.js
    const contractAddress= await storehash.options.address;
    console.log("ETH address is:" + contractAddress);
    this.setState({contractAddress});

    // check if verified
    if (this.state.token_balance >= 10){
      this.setState({verified: true});
    }
    console.log("User is verified? " + this.state.verified);

    // read text input as buffer
    let reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => this.convertTextToBuffer(reader);
  };

  //submit both image and text to ipfs network, save two returned hashes to states.
  actualUpload = async () => {

    //If there is no image, the buffer is ''
    if(this.state.imageBuffer !== ''){
      console.log(this.state.textBuffer);

      await ipfs.add(this.state.textBuffer, async (err, ipfsHash) => {
        console.log("error message:"+err);
        this.setState({ ipfsHash:ipfsHash[0].hash });

        await ipfs.add(this.state.imageBuffer, (err, imageHash) => {
            this.setState({ imageHash:imageHash[0].hash });
            const time = new Date().toLocaleString();

            if(this.state.verified)  {
              storehash.methods.sendUpdate(this.state.ipfsHash,this.state.location,
                time,this.state.imageHash,this.state.category, this.state.extension).send({
                from: this.state.walletAddress
              }, (error, transactionHash) => {
                this.setState({transactionHash});
              }); //storehash

              this.getToken();
            }
          });
        })
    }
    else{ //we only want to send the text
      console.log(this.state.textBuffer)
      await ipfs.add(this.state.textBuffer, async (err, ipfsHash) => {
        this.setState({ ipfsHash:ipfsHash[0].hash });
        const time = new Date().toLocaleString();
        if(this.state.verified){
          //Trying to use '' as an image hash/place holder
          storehash.methods.sendUpdate(this.state.ipfsHash,this.state.location,
            time,'',this.state.category, this.state.extension).send({
              from: this.state.walletAddress
            }, (error, transactionHash) => {
              this.setState({transactionHash});
            }); //storehash
        }
      })
    }
  }

  getTransactionReceipt = async () => {
    try{
      this.setState({
        blockNumber: "waiting..",
        gasUsed: "waiting..."
      });

      //get Transaction Receipt in console on click
      //See: https://web3js.readthedocs.io/en/1.0/web3-eth.html#gettransactionreceipt
      await web3.eth.getTransactionReceipt(this.state.transactionHash, (err, txReceipt) => {
              console.log(err,txReceipt);
              this.setState({txReceipt});
            });

      //await for getTransactionReceipt
      await this.setState({blockNumber: this.state.txReceipt.blockNumber});
      await this.setState({gasUsed: this.state.txReceipt.gasUsed});
    }

    catch(error){
      console.log(error);
    }

  }

  // for any user who has metamask, send the ERC-20 tokens to the account.
  getToken = (tokens = 1) => {
    const amount = BigInt(1000000000000000000 * tokens);
    MemeToken.methods.buy(amount).send({
    from: this.state.walletAddress
    },(error,tokenTransactionHash) => {
    console.log('token received successfully with the transaction hash: ' + tokenTransactionHash);
    });
  }

  // get the user reputation
  updateReputation = async() => {
      const address = this.state.walletAddress;
      const repu = await storehash.methods.getReputation(address).call().then((result) => {
        console.log(result);
        return result;
      }).catch( error =>
        console.log(error)
      );
    // console.log(this.state.reputation);
    this.setState({reputation: repu});
    // console.log(this.state.reputation);
  }

  //To capture the reputation of the message poster
  returnReputation = async(userAddress) => {
    const address = userAddress;
    const repu = await storehash.methods.getReputation(address).call().then((result) => {
      //console.log("This is the repu " + result + (result > 0));
      return result});
    console.log(repu > 0)
    return repu > 0;
  }

  //Update balance and verified state right after getting the token balance
  getTokenBalance = async() => {
    const address = this.state.walletAddress;
    const balance = await MemeToken.methods.checkBalance().call(
      {from: this.state.walletAddress}).then((result) => {
      console.log("This is the current token balance " + result/1000000000000000000);
      return result});;
    this.setState({token_balance: balance/1000000000000000000});

    if(this.state.token_balance > 5){
      this.setState({verified: true});
    }
  }

  // report post (downvote)
  downvotePost = async (address, hash, id) => {
    console.log('call reportPost function');
    //decrease user reputation
    storehash.methods.decreaseReputation(address, 1).send({
      from: this.state.walletAddress
    });
    storehash.methods.decreaseVote(hash, id).send({
      from: this.state.walletAddress
    });
    this.updateReputation();
  }
//upvote post
  upvotePost = async (address, hash, id) => {
    console.log('call upVote function');
    //increase user reputation
    storehash.methods.increaseReputation(address, 1).send({from: this.state.walletAddress});
    storehash.methods.increaseVote(hash, id).send({
      from: this.state.walletAddress
    });
    this.updateReputation();
<<<<<<< HEAD
    //*To implement scaling*: let postReputation = await storehash.methods.getVote(hash).call().then((result) => {return result});
    //Edit scaledTokens with postReputation to implement scaling
    let scaledTokens = 1;
    this.getToken(scaledTokens);
=======
    this.updateNews();
>>>>>>> 2d9427ec41d88752080f8619bc1107f9d18abadb
  }

//render news including html and css
  // get the user name
  updateUsername = async() => {
      const address = this.state.walletAddress;
      console.log('call updateUsername function');
      const name = await storehash.methods.getUsername(address).call().then((result) => {
        // console.log(result);
        return result;
      });
     console.log("before update name: "+this.state.username);
     this.setState({username: web3.utils.hexToAscii(name)});
     console.log("after update name: "+name);
  }

  getUsername = async(address) => {

    var name = await storehash.methods.getUsername(address).call().then((result) => {
      console.log('fetched name: '+result);
      return result;
    });
    if (name == 0x0000000000000000000000000000000000000000000000000000000000000000){
      console.log("no name");
      // default userName is first 10 char of userAddress
      name = address.substring(0,9);
    } else{
      name = web3.utils.hexToAscii(name);
    }
    this.setState({username: name});
    return name;
  }

  updateBio = async() => {
      const address = this.state.walletAddress;
      console.log('call updateBio function');
      const bio = await storehash.methods.getBio(address).call().then((result) => {
        // console.log(result);
        return result;
      });
     console.log("before update bio: "+this.state.bio);
     this.setState({bio: web3.utils.hexToAscii(bio)});
     console.log("after update bio: "+bio);
  }

  getBio = async(address) => {

    var bio = await storehash.methods.getBio(address).call().then((result) => {
      console.log('fetched bio: '+result);
      return result;
    });
    if (bio == 0x0000000000000000000000000000000000000000000000000000000000000000){
      console.log("no bio");
      // default userName is first 10 char of userAddress
      bio = "I am a Northwestern Student";
    } else{
      bio = web3.utils.hexToAscii(bio);
    }
    this.setState({bio: bio});
    return bio;
  }

  editProfile = async () => {
    const address = this.state.walletAddress;
    const name = this.state.nameField;
    console.log('call editProfile function');
    const bio = this.state.bioField;

    console.log("state: "+name+" field: "+this.state.username);
    console.log("state: "+bio+" field: "+this.state.bio);
    // change username/bio on chain only if textField is nonempty and not the same as username
    if (!(!name || 0 === name.length) && !(!bio || 0 === bio.length)){
      console.log('Profile being processed; name: '+name+' bio: '+bio);
      storehash.methods.setProfile(address, web3.utils.asciiToHex(bio), web3.utils.asciiToHex(name)).send({from: this.state.walletAddress});
    } else if (!(!bio || 0 === bio.length)) {
      console.log('bio being processed: '+bio);
      storehash.methods.setBio(address, web3.utils.asciiToHex(bio)).send({from: this.state.walletAddress});
    } else if (!(!name || 0 === name.length)) {
      console.log('name being processed: '+name);
      storehash.methods.setUsername(address, web3.utils.asciiToHex(name)).send({from: this.state.walletAddress});
    }
    this.updateUsername();
    this.updateBio();
  }



  renderNews = (data) => {
    return data.slice(0).reverse().map((update,index) =>
    <ListGroup.Item key={index}>
    <Row>
        <Col xs={8} align="left" style={{ display: "flex", alignItems:"flex-start",textOverflow: "clip" }}>
            User: {update.username}<br />
            Acc: {update.user.substring(0,5)}...
        </Col>
      <Col>
          <ViewNews update={update} user={this.state.walletAddress}/>
      </Col>
      <div style={{
        display:'inline',
        marginLeft: "16px",
        marginRight: "16px",
        backgroundColor:"#8080807a",
        borderRadius: "5px",
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'}}
      >
          <DownOutlined
          style={{ fontSize: '16px', marginLeft:"4px"}}
          onClick = {()=>this.downvotePost(update.user, update.fileHash, update.id)}
          />
          <UpOutlined
          style={{ fontSize: '16px', marginLeft:"4px", marginRight:"4px"}}
          onClick = {()=>this.upvotePost(update.user, update.fileHash, update.id)}
          />
      </div>
      {this.state.newsList[update.id].post_repu}
    </Row>
    <Row>
      <Col style={{ display: "flex"}}>Location: {update.location}</Col>
      <Col offset={6} style={{ textAlign: "center" }}>Submitted on: {update.timeStamp}</Col>
    </Row>
    {/* <Row>
      <Col>Category: {update.category}</Col>
    </Row> */}
    </ListGroup.Item>);
  }


render() {
      //newsList length
      const news_total = this.state.newsList.length;
      //free posts
      const free_posts = this.state.newsList.filter(e=>e.category=='free');
      //premium posts
      const premium_posts = this.state.newsList.filter(e=>e.category=='premium');
      // grabs query from serach bar
      const { search } = window.location;
      // const query = new URLSearchParams(search).get('s').toLowerCase();
      // for button searching: replace "this.state.searchField" with "query"
      const filtered_free_posts = this.state.newsList
        .filter(e => e.username.toLowerCase().includes(this.state.searchField) && e.category=='free');

      const filtered_premium_posts = this.state.newsList
        .filter(e => e.username.toLowerCase().includes(this.state.searchField) && e.category=='premium');

      //render website
        return (
        <div className="App">
        <p className="App-header">Northwestern Covid-19 News-Sharing Platform</p>
          <hr />
          <Row>
            <Col>
                <strong>News update</strong>
                <hr />
                <Search
                  searchQuery={this.state.searchField}
                  setSearchQuery = {this.onSearchBarInput}
                />
                <Tabs defaultActiveKey="free" id="tab">
                <Tab eventKey="free" title="Free">
                <div className="list-wrapper">
                  <p>{this.renderNews(filtered_free_posts)}</p>
                </div>
                </Tab>
                <Tab eventKey="premium" title="Premium">
                <div className="list-wrapper">
                  <p>{this.renderNews(filtered_premium_posts)}</p>
                </div>
                </Tab>
              </Tabs>
            </Col>
            <Col>
            <Container>
              <strong>Post and Profile</strong>
              <hr />
              <Tabs defaultActiveKey="post" id="profile-tab">
                <Tab eventKey="post" title="Post">
                  <br />
                  <Row>
                    <Col span={8}>
                      <p> Metamask account: {this.state.walletAddress}</p>
                    </Col>
                  </Row>
                    <div className="button">
                      <Row>
                        <Col xs={3}>
                          <Button bsStyle="primary" style={{width:"130px"}} type="submit" onClick={()=>this.getToken(this.state.tokensRequested)} >Get Tokens</Button>
                        </Col>
                        <Col xs={8}>
                          <Form.Control 
                            type="number" 
                            placeholder="Number of Tokens" 
                            onChange={e=>{this.setState({tokensRequested:e.target.value});}}>
                          </Form.Control>
                        </Col>
                      </Row>
                    </div>
                  <hr />
                  <Form onSubmit={this.updateSubmit}>
                    <Row>
                      <Col xs={3}>Report</Col>
                      <Col xs={8}><textarea className="textInputBox" onChange={e=>{this.setState({value:e.target.value});}}/></Col>
                    </Row>

                    <Row>
                      <Col xs={3}>Location</Col>
                      <Col xs={8}><textarea className="locationInputBox" onChange={e=>{this.setState({location:e.target.value});}}/></Col>
                    </Row>

                    <Row>
                      <Col xs={{span:10, offset: 1}} style={{ display: "flex"}}>
                        <Form.Control
                          as="select"
                          custom
                          onChange={e=>{this.setState({category:e.target.value}); console.log(this.state.category)}}
                        >
                          <option value="choose">Choose a category: </option>
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                        </Form.Control>
                      </Col>
                    </Row>

                    <br/>

                    <Row>
                      <Col xs={9}>
                        <input className="input" type = "file" onChange = {this.captureFile}/>
                      </Col>
                      <Col xs={3}>
                        <div className="button">
                          <Button bsStyle="primary" style={{width:"130px"}}type="submit" > Submit
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </Form>
                  <hr/>

                  <Button onClick = {this.getTransactionReceipt}> Get Transaction Receipt </Button>
                  <hr />
                  <Receipt ipfsHash={this.state.ipfsHash} imageHash={this.state.imageHash}
                       contractAddress={this.state.contractAddress} transactionHash={this.state.transactionHash}
                       blockNumber={this.state.blockNumber} gasUsed={this.state.gasUsed}/>
                </Tab>
                <Tab eventKey="profile" title="Profile">
                <br />
                  <Row>
                    <Col xs={3} align="left">
                      <p> Address: </p>
                      <p> Username: </p>
                      <p> Reputation:  </p>
                      <p> NUMT Balance: </p>
                      <p> Bio: </p>
                    </Col>
                    <Col xs={8} align="left">
                      <p> {this.state.walletAddress}</p>
                      <p> {this.state.username} </p>
                      <p> {this.state.reputation} </p>
                      <p> {this.state.token_balance} </p>
                      <p> {this.state.bio} </p>
                    </Col>
                  </Row>
                  <hr />
                    <Row>
                      <Col xs={3}>
                        New Username:
                      </Col>
                      <Col xs={8}>
                        <textarea className="nameInputBox"
                                  maxlength="32"
                                  rows="1" cols="50"
                                  onChange={e=>{this.setState({nameField:e.target.value});}}/>
                      </Col>
                    </Row>
                  <hr />
                    <Row>
                      <Col xs={3}>
                        New Bio:
                      </Col>
                      <Col xs={8}>
                        <textarea className="bioInputBox"
                                  rows="1" cols="50"
                                  maxlength="32"
                                  onChange={e=>{this.setState({bioField:e.target.value});}}/>
                      </Col>
                    </Row>
                  <hr />
                  <div className="button">
                    <Button bsStyle="primary" style={{width:"130px"}} type="submit" onClick={this.editProfile}> Set Profile</Button>
                  </div>
                </Tab>
              </Tabs>
        </Container>
            </Col>
          </Row>

        <p className="App-header">About</p>

          <hr />
     </div>
      );
    } //render
} //App
export default App;
