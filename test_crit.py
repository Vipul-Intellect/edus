from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria
import sys

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer)

with app.app_context():
    db.create_all()
    
    @event.listens_for(Session, "do_orm_execute")
    def receive_do_orm_execute(orm_execute_state):
        if orm_execute_state.is_select:
            print("Applying filter...")
            orm_execute_state.statement = orm_execute_state.statement.options(
                with_loader_criteria(
                    db.Model,
                    lambda cls: cls.college_id == 5 if hasattr(cls, 'college_id') else True,
                    include_aliases=True
                )
            )

    try:
        users = User.query.all()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
