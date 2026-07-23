export class TurnManager {
  private turn = 0;

  getCurrentTurn(): number {
    return this.turn;
  }

  advanceTurn(): number {
    this.turn += 1;
    return this.turn;
  }
}
