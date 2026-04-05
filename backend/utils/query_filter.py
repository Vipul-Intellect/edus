from sqlalchemy import event
from sqlalchemy.orm import Session
from flask import g
import traceback

def init_query_filter(db):
    """Initialize automatic tenant filtering"""
    
    @event.listens_for(Session, "do_orm_execute")
    def auto_filter_by_college(orm_execute_state):
        """Naturally-inject college_id isolation with a double-layered approach"""
        
        # 1. Filter only SELECT queries
        if not orm_execute_state.is_select:
            return
            
        # 2. Skip for Super Admin or Recovery Mode
        if getattr(g, 'is_super_admin', False) or getattr(g, 'is_recovery_mode', False):
            # print(f"⚡ [FILTER] Bypassing isolation (SuperAdmin or RecoveryMode)")
            return
            
        # 3. Get college context
        college_id = getattr(g, 'college_id', None)
        if college_id is None:
            return
            
        # 4. Layer 1: ORM-native Criteria (Handles relationships and joined loads)
        from sqlalchemy.orm import with_loader_criteria
        from extensions import db
        
        # Re-apply statement with options
        # We capture college_id as a default argument 'cid' to the lambda to avoid
        # SQLAlchemy's InvalidRequestError related to closure variable caching.
        orm_execute_state.statement = orm_execute_state.statement.options(
            with_loader_criteria(
                db.Model,
                lambda cls, cid=college_id: cls.college_id == cid if hasattr(cls, "college_id") else True,
                include_aliases=True,
                track_closure_variables=False
            )
        )
        
        # 5. Layer 2: Explicit Table Transformation (Handles direct Model.query and some Core queries)
        # We iterate through ALL froms to ensure joined tables are also filtered
        statement = orm_execute_state.statement
        try:
            for table in statement.froms:
                # If it's a table with college_id, add explicit WHERE
                if hasattr(table, 'c') and 'college_id' in table.c:
                    orm_execute_state.statement = statement.where(
                        table.c.college_id == college_id
                    )
                    # Note: We don't break here; we apply to all relevant froms
        except Exception as e:
            # Failure here isn't fatal as with_loader_criteria is the primary guard
            pass
            
        # print(f"🛡️  [ISOLATION] Finalized isolation for {college_id}")

    @event.listens_for(Session, "before_flush")
    def automatic_college_id_injection(session, flush_context, instances):
        """Automatically set college_id on all new objects before they hit the DB"""
        # Skip if Super Admin is logged in
        if hasattr(g, 'is_super_admin') and g.is_super_admin:
            return

        college_id = getattr(g, 'college_id', None)
        if not college_id:
            return

        for obj in session.new:
            # If the model has a college_id attribute and it's not set, set it
            if hasattr(obj, 'college_id') and getattr(obj, 'college_id') is None:
                setattr(obj, 'college_id', college_id)
                # print(f"💉 Injected college_id={college_id} into new {type(obj).__name__}")

# Call this in app.py
def setup_tenant_filtering(app, db):
    with app.app_context():
        init_query_filter(db)
