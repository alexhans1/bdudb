var User = bookshelf.Model.extend(
  {
    tableName: 'users',
    hasTimestamps: false,

    verifyPassword: function(password) {
      return this.get('password') === password;
    },
  },
  {
    byEmail: function(email) {
      return this.forge()
        .query({ where: { email: email } })
        .fetch();
    },
  },
);
