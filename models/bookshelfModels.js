module.exports = Bookshelf => {
  // User model
  const User = Bookshelf.Model.extend({
    tableName: 'users',
    hasTimestamps: true,

    tournaments() {
      return this.belongsToMany(Tournament).withPivot([
        'id',
        'role',
        'is_independent',
        'attended',
        'teamname',
        'comment',
        'price_owed',
        'price_paid',
        'success',
        'points',
        'funding',
        'transaction_date',
        'transaction_from',
        'partner1',
        'partner2',
        'created_at',
        'updated_at',
      ]);
    },
  });

  const Users = Bookshelf.Collection.extend({
    model: User,
  });

  // Tournament model
  const Tournament = Bookshelf.Model.extend({
    tableName: 'tournaments',
    hasTimestamps: true,

    users() {
      return this.belongsToMany(User).withPivot([
        'id',
        'role',
        'is_independent',
        'attended',
        'teamname',
        'comment',
        'price_owed',
        'price_paid',
        'success',
        'points',
        'funding',
        'transaction_date',
        'transaction_from',
        'partner1',
        'partner2',
        'created_at',
        'updated_at',
      ]);
    },
  });

  const Tournaments = Bookshelf.Collection.extend({
    model: Tournament,
  });

  // Registration model
  const Registration = Bookshelf.Model.extend({
    tableName: 'tournaments_users',
    hasTimestamps: true,
  });

  const Registrations = Bookshelf.Collection.extend({
    model: Registration,
  });

  const Bug = Bookshelf.Model.extend({
    tableName: 'bugs',
    hasTimestamps: true,

    user() {
      return this.belongsTo(User);
    },
  });

  const Bugs = Bookshelf.Collection.extend({
    model: Bug,
  });

  const Club_Debt = Bookshelf.Model.extend({
    tableName: 'club_debt',
  });

  const Club_Debt_Col = Bookshelf.Collection.extend({
    model: Club_Debt,
  });

  const Transaction_Ids = Bookshelf.Model.extend({
    tableName: 'transaction_ids',
    hasTimestamps: true,
  });

  const Transaction_Ids_Col = Bookshelf.Collection.extend({
    model: Transaction_Ids,
  });

  return {
    User,
    Users,
    Tournament,
    Tournaments,
    Registration,
    Registrations,
    Bug,
    Bugs,
    Club_Debt,
    Club_Debt_Col,
    Transaction_Ids,
    Transaction_Ids_Col,
  };
};
