# Chokro Domain Context

Chokro is a circular economy and smart recycling platform connecting households, recycling partners, and campus institutions with rate cards, QR drop zones, and Green Wallet rewards in Bangladesh.

## Language

### Core Entities & Roles

**Individual**:
A registered user who creates recyclable listings or deposits materials at drop zones to earn wallet credits.
_Avoid_: User, customer, citizen, consumer

**Partner**:
An organization or business verified to collect, process, or recycle specific waste streams and materials.
_Avoid_: Vendor, collector, merchant, dealer

**Admin**:
A platform operator who verifies partners, manages rate cards, monitors drop zones, and adjusts credit ledgers.
_Avoid_: Superuser, moderator, staff

**Drop Zone**:
A designated physical collection location (e.g., campus bin or hub) with an authenticated QR token for material drop-offs.
_Avoid_: Bin, station, collection point, hub

---

### Marketplace & Valuation

**Listing**:
An offer of recyclable or reusable material posted by an individual with specified condition and weight or piece count.
_Avoid_: Post, item, ad, entry

**Rate Card**:
The published reference pricing table defining unit price in BDT per category and condition band.
_Avoid_: Price list, tariff, catalog

**Condition Band**:
The quality classification of an item (`EXCELLENT`, `GOOD`, `FAIR`, `POOR`) used to determine rate card valuation.
_Avoid_: State, quality grade, status

**Next-Life Path**:
The recommended circular transition path for an item (`REUSE`, `DONATE`, `REPAIR`, `RESELL`, `RECYCLE`).
_Avoid_: Action, disposal method, category

---

### Financial & Trust Ledger

**Credit Transaction (`credit_txn`)**:
An immutable record in the append-only ledger representing earned, redeemed, or adjusted wallet credits.
_Avoid_: Payment, transfer, balance row

**Verified Balance**:
The cumulative sum of confirmed credit transactions ready for redemption or payout.
_Avoid_: Main balance, actual balance, wallet balance

**Pending Balance**:
The cumulative sum of unconfirmed credit transactions awaiting physical verification or partner collection.
_Avoid_: Escrow balance, locked balance, holding balance

**Trust Gate**:
The verification check requiring physical inspection or QR drop-off confirmation before converting pending credits to verified.
_Avoid_: Approval process, verification workflow
