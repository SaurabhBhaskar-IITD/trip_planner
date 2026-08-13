/**
 * Money value object.
 *
 * WHY: Prices, taxes, supplier costs and margins are business-critical. IEEE-754
 * floating point silently loses precision (0.1 + 0.2 !== 0.3), which is
 * unacceptable for money. We therefore represent every monetary amount as an
 * INTEGER number of minor units (paise for INR) and never as a float.
 *
 * This type is immutable and framework-free. It is the single sanctioned way to
 * do money arithmetic anywhere in the system (engine, services, seed data).
 */

export type CurrencyCode = "INR";

export class Money {
  /** Amount in minor units (paise). Always an integer. */
  readonly minorUnits: number;
  readonly currency: CurrencyCode;

  private constructor(minorUnits: number, currency: CurrencyCode) {
    if (!Number.isInteger(minorUnits)) {
      throw new Error(`Money.minorUnits must be an integer, received ${minorUnits}`);
    }
    this.minorUnits = minorUnits;
    this.currency = currency;
  }

  static fromMinor(minorUnits: number, currency: CurrencyCode = "INR"): Money {
    return new Money(minorUnits, currency);
  }

  /** Construct from a major-unit amount (rupees). Rounds to the nearest paisa. */
  static fromMajor(majorUnits: number, currency: CurrencyCode = "INR"): Money {
    return new Money(Math.round(majorUnits * 100), currency);
  }

  static zero(currency: CurrencyCode = "INR"): Money {
    return new Money(0, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  /** Multiply by a dimensionless quantity (e.g. pax count, nights). Rounds to paisa. */
  multiply(factor: number): Money {
    return new Money(Math.round(this.minorUnits * factor), this.currency);
  }

  /**
   * Apply a percentage (e.g. 5 for 5%, 18 for 18% GST). Rounds to paisa.
   * Kept separate from multiply() to make pricing rules read clearly.
   */
  percentage(percent: number): Money {
    return new Money(Math.round((this.minorUnits * percent) / 100), this.currency);
  }

  isZero(): boolean {
    return this.minorUnits === 0;
  }

  isNegative(): boolean {
    return this.minorUnits < 0;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  /** Sum a list; empty list yields zero in the given currency. */
  static sum(items: Money[], currency: CurrencyCode = "INR"): Money {
    return items.reduce((acc, m) => acc.add(m), Money.zero(currency));
  }

  toMajor(): number {
    return this.minorUnits / 100;
  }

  toJSON(): { minorUnits: number; currency: CurrencyCode } {
    return { minorUnits: this.minorUnits, currency: this.currency };
  }
}
