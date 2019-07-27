exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTableIfNotExists('users', function(table) {
      table.increments();
      table
        .string('email')
        .unique()
        .notNullable();
      table.string('password').notNullable();
      table.string('name');
      table.string('vorname');
      table.string('gender');
      table.string('food');
      table.string('image');
      table.integer('position');
      table.string('resetPasswordToken');
      table.bigInteger('resetPasswordExpires');
      table.datetime('last_login');
      table.datetime('last_mail').defaultTo('0000-00-00 00:00:00');
      table.integer('new_tournament_count').defaultTo(0);
      table.timestamps();
    }),

    knex.schema.createTableIfNotExists('tournaments', function(table) {
      table.increments();
      table.string('name').notNullable();
      table.string('ort');
      table.date('startdate');
      table.date('enddate');
      table.date('deadline');
      table.string('format');
      table.string('league');
      table.string('accommodation');
      table.decimal('speakerprice', 6, 2);
      table.decimal('judgeprice', 6, 2);
      table.integer('rankingvalue');
      table.integer('teamspots');
      table.integer('judgespots');
      table.string('link');
      table.string('comments');
      table.string('language').notNullable();
      table.timestamps();
    }),

    knex.schema.createTableIfNotExists('tournaments_users', function(table) {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('tournament_id')
        .unsigned()
        .references('id')
        .inTable('tournaments');
      table.string('role');
      table.string('teamname');
      table.text('comment');
      table.integer('attended').defaultTo(0);
      table.decimal('price_owed', 6, 2).defaultTo(0.0);
      table.decimal('price_paid', 6, 2).defaultTo(0.0);
      table.string('success');
      table.decimal('points', 6, 2).defaultTo(0.0);
      table
        .integer('partner1')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('partner2')
        .unsigned()
        .references('id')
        .inTable('users');
      table.timestamps();
    }),

    knex.schema.createTableIfNotExists('bugs', function(table) {
      table.increments();
      table.integer('status').defaultTo(0);
      table.text('description').notNullable();
      table.string('type').notNullable();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table.timestamps();
    }),

    knex.schema.createTableIfNotExists('club_debt', function(table) {
      table.decimal('debt', 6, 2).defaultTo(0.0);
      table.datetime('timestamp');
    }),
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('users'),
    knex.schema.dropTable('tournaments'),
    knex.schema.dropTable('tournaments_users'),
    knex.schema.dropTable('bugs'),
  ]);
};
