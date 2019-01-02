#!/usr/local/bin/node

const fs = require("fs");
const Web3 = require("web3");
const web3 = new Web3();

const program = require("commander");
const inquirer = require("inquirer");

program
  .version("0.1.0")
  .option("--privateKey <path>", "path to a text file containing private key")
  .option("--abi <path>", "path to json file with ABI (required)")
  .option(
    "--truffle",
    "tells the application that abi file should be treated as a truffle build file"
  )
  .parse(process.argv);

if (!program.abi) {
  program.outputHelp();
  return;
}

const run = async () => {
  const privateKey = fs.readFileSync(program.privateKey, { encoding: "utf-8" });

  let abi = JSON.parse(fs.readFileSync(program.abi));
  if (program.truffle) abi = abi.abi;

  const methods = abi.filter(
    a => a.constant === false && a.type === "function"
  );

  const commonData = await inquirer.prompt([
    {
      name: "actionId",
      type: "number"
    },
    {
      name: "method",
      type: "list",
      choices: methods.map((m, i) => ({ value: i, name: m.name }))
    }
  ]);

  const inputs = methods[commonData.method].inputs.filter(
    i => i.name !== "_signature"
  );

  const encodeArgs = await inquirer.prompt(
    inputs.map(i => ({ name: i.name, message: i.name + " (" + i.type + ")" }))
  );

  const abiEncodedParameters = web3.eth.abi.encodeParameters(
    inputs.map(i => i.type),
    inputs.map(i => encodeArgs[i.name])
  );

  const abiEncoded = web3.eth.abi.encodeParameters(
    ["uint", "string", "bytes"],
    [commonData.actionId, methods[commonData.method].name, abiEncodedParameters]
  );

  const hash = web3.utils.keccak256(abiEncoded);

  const signature = web3.eth.accounts.sign(hash, privateKey);

  console.log("\n_signature:\n" + signature.signature + "\n");
};

run();
