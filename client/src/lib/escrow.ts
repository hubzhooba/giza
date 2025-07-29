import { ethers } from 'ethers';
import { Invoice, Milestone } from '@/types';

const ESCROW_ABI = [
  'function createEscrow(address payee, uint256 amount, uint256 releaseTime) payable returns (uint256)',
  'function releasePayment(uint256 escrowId)',
  'function getEscrowDetails(uint256 escrowId) view returns (address payer, address payee, uint256 amount, uint256 releaseTime, bool released)',
  'function disputeEscrow(uint256 escrowId)',
  'function resolveDispute(uint256 escrowId, bool releaseToPayee)',
  'event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount)',
  'event PaymentReleased(uint256 indexed escrowId, address indexed payee, uint256 amount)',
];

export class EscrowService {
  private static instance: EscrowService;
  private contractAddress: string = '0x...'; // Deploy and add actual contract address

  static getInstance(): EscrowService {
    if (!EscrowService.instance) {
      EscrowService.instance = new EscrowService();
    }
    return EscrowService.instance;
  }

  async createEscrow(
    invoice: Invoice,
    milestone: Milestone,
    signer: ethers.Signer
  ): Promise<string> {
    const contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, signer);
    
    const releaseTime = Math.floor(milestone.dueDate.getTime() / 1000);
    const amount = ethers.parseEther(milestone.amount.toString());
    
    const tx = await contract.createEscrow(
      invoice.toUser.email,
      amount,
      releaseTime,
      { value: amount }
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'EscrowCreated');
    
    return event?.args?.escrowId.toString() || '';
  }

  async releasePayment(escrowId: string, signer: ethers.Signer): Promise<boolean> {
    try {
      const contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, signer);
      const tx = await contract.releasePayment(escrowId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Failed to release payment:', error);
      return false;
    }
  }

  async getEscrowDetails(escrowId: string, provider: ethers.Provider) {
    const contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, provider);
    const details = await contract.getEscrowDetails(escrowId);
    
    return {
      payer: details[0],
      payee: details[1],
      amount: ethers.formatEther(details[2]),
      releaseTime: new Date(details[3].toNumber() * 1000),
      released: details[4],
    };
  }

  async disputeEscrow(escrowId: string, signer: ethers.Signer): Promise<boolean> {
    try {
      const contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, signer);
      const tx = await contract.disputeEscrow(escrowId);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Failed to dispute escrow:', error);
      return false;
    }
  }

  generateSmartContractCode(): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FreelanceEscrow {
    struct Escrow {
        address payer;
        address payee;
        uint256 amount;
        uint256 releaseTime;
        bool released;
        bool disputed;
    }
    
    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCount;
    address public arbiter;
    
    event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount);
    event PaymentReleased(uint256 indexed escrowId, address indexed payee, uint256 amount);
    event EscrowDisputed(uint256 indexed escrowId);
    event DisputeResolved(uint256 indexed escrowId, bool releasedToPayee);
    
    constructor() {
        arbiter = msg.sender;
    }
    
    function createEscrow(address _payee, uint256 _amount, uint256 _releaseTime) external payable returns (uint256) {
        require(msg.value == _amount, "Incorrect payment amount");
        require(_payee != address(0), "Invalid payee address");
        require(_releaseTime > block.timestamp, "Release time must be in the future");
        
        escrowCount++;
        escrows[escrowCount] = Escrow({
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            releaseTime: _releaseTime,
            released: false,
            disputed: false
        });
        
        emit EscrowCreated(escrowCount, msg.sender, _payee, _amount);
        return escrowCount;
    }
    
    function releasePayment(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(!escrow.released, "Payment already released");
        require(!escrow.disputed, "Escrow is disputed");
        require(
            msg.sender == escrow.payer || 
            (msg.sender == escrow.payee && block.timestamp >= escrow.releaseTime),
            "Unauthorized release"
        );
        
        escrow.released = true;
        payable(escrow.payee).transfer(escrow.amount);
        
        emit PaymentReleased(_escrowId, escrow.payee, escrow.amount);
    }
    
    function disputeEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(!escrow.released, "Payment already released");
        require(msg.sender == escrow.payer || msg.sender == escrow.payee, "Unauthorized");
        
        escrow.disputed = true;
        emit EscrowDisputed(_escrowId);
    }
    
    function resolveDispute(uint256 _escrowId, bool _releaseToPayee) external {
        require(msg.sender == arbiter, "Only arbiter can resolve disputes");
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.disputed, "No dispute to resolve");
        require(!escrow.released, "Payment already released");
        
        escrow.released = true;
        escrow.disputed = false;
        
        if (_releaseToPayee) {
            payable(escrow.payee).transfer(escrow.amount);
        } else {
            payable(escrow.payer).transfer(escrow.amount);
        }
        
        emit DisputeResolved(_escrowId, _releaseToPayee);
    }
    
    function getEscrowDetails(uint256 _escrowId) external view returns (
        address payer,
        address payee,
        uint256 amount,
        uint256 releaseTime,
        bool released
    ) {
        Escrow memory escrow = escrows[_escrowId];
        return (escrow.payer, escrow.payee, escrow.amount, escrow.releaseTime, escrow.released);
    }
}`;
  }
}